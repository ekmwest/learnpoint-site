const STATUS_URL = '/status/status.json';
const INCIDENTS_URL = '/status/incidents.json';

// const STATUS_URL = 'https://json-test.ekmwest.io/status.json';
// const OUTAGES_URL = 'https://json-test.ekmwest.io/outages.json';

const MAX_CALENDAR_MONTHS = 9; // Must be multiple of 3
const MAX_CALENDAR_MONTHS_PAGE = 3;

const firstDayOfWeekIsMonday = true;

let paginationPage = 1;

document.addEventListener('click', event => {
    const paginateButton = event.target.closest('.status-page__pagination-button');
    if (!paginateButton) {
        return;
    }

    const directionForward = paginateButton.classList.contains('FORWARD');

    if (directionForward) {
        if (paginationPage > 1) {
            paginationPage--;
        }
    } else {
        if (paginationPage < MAX_CALENDAR_MONTHS / MAX_CALENDAR_MONTHS_PAGE) {
            paginationPage++;
        }
    }

    updatePagination();
});


document.addEventListener('DOMContentLoaded', async event => {
    setStatus();
    await renderCalendar();
    updatePagination();
});

async function setStatus() {

    const statusElement = document.querySelector('.status-page__status');

    const status = await getStatus();

    if (status.fullyOperational === true) {
        statusElement.classList.add('UP');
        return;
    }

    const message = status.messages[status.notFullyOperationalMessage]

    const statusMessageElementEn = document.querySelector('.status-page__status-message[lang=en]');
    const statusMessageElementSv = document.querySelector('.status-page__status-message[lang=sv]');

    statusMessageElementEn.textContent = message.en;
    statusMessageElementSv.textContent = message.sv;

    statusElement.classList.add('DOWN');
}

async function renderCalendar() {
    const calendarHTML = await createCalendarHTML();
    const calendarElement = document.querySelector('.status-page__calendar');
    calendarElement.innerHTML = calendarHTML;
}

function updatePagination() {
    console.log(paginationPage);

    const forwardButton = document.querySelector('.status-page__pagination-button.FORWARD');
    const backButton = document.querySelector('.status-page__pagination-button.BACK');

    if (paginationPage > 1) {
        forwardButton.classList.remove('DISABLED');
    } else {
        forwardButton.classList.add('DISABLED');
    }

    if (paginationPage < MAX_CALENDAR_MONTHS / MAX_CALENDAR_MONTHS_PAGE) {
        backButton.classList.remove('DISABLED');
    } else {
        backButton.classList.add('DISABLED');
    }

    const months = document.querySelectorAll('.status-page__month');
    months.forEach(month => {
        const pageIndex = month.dataset.page;
        if(pageIndex === paginationPage.toString()) {
            month.style.display = 'block';
        } else {
            month.style.display = 'none';
        }
    });
}


async function createCalendarHTML() {

    let html = '';

    const incidents = await getIncidents();

    const months = getMonths();

    const today = new Date();

    let monthIndex = 0;
    let pageIndex = 0;

    for (const month of months) {

        monthIndex++;

        pageIndex = Math.floor(MAX_CALENDAR_MONTHS / MAX_CALENDAR_MONTHS_PAGE) - Math.ceil(monthIndex / MAX_CALENDAR_MONTHS_PAGE) + 1;

        html += '<div class="status-page__month" data-page="' + pageIndex + '">';
        html += `<div class="status-page__month-header">`;
        html += `<div class="status-page__month-name">
                    <span lang="en">${getMonthName(month.month, "en")} ${month.year}</span>
                    <span lang="sv">${getMonthName(month.month, "sv")} ${month.year}</span>
                 </div>`;
        html += `<div class="status-page__month-uptime">${getMonthUptimePercentage(month.year, month.month, incidents)}%</div>`;
        html += `</div>`;
        html += '<div class="status-page__days">';

        for (const day of month.days) {

            if (day.getMonth() === month.month) {

                if (day.getFullYear() === day.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() >= today.getDate()) {

                    const title = day.getDate() + ' ' + getMonthName(month.month) + ' ' + day.getFullYear();
                    html += `<div title="${title}" class="status-page__day FUTURE">`;

                } else {

                    const incident = getIncident(day, incidents);

                    if (incident) {

                        if (incident.major) {

                            const title = incident.title;
                            html += `<div title="${title}" class="status-page__day OUTAGE MAJOR">`;

                        } else {

                            const title = incident.title;
                            html += `<div title="${title}" class="status-page__day OUTAGE">`;
                        }

                    } else {

                        const title = day.getDate() + ' ' + getMonthName(month.month) + ' ' + day.getFullYear();
                        html += `<div title="${title}" class="status-page__day">`;
                    }
                }

            } else {

                html += `<div class="status-page__day OUTSIDE">`;
            }

            html += '</div>';
        }

        html += '</div>';
        html += '</div>';
    }

    return html;
}

async function getIncidents() {
    const res = await fetch(INCIDENTS_URL);
    return await res.json();
}

async function getStatus() {
    const res = await fetch(STATUS_URL);
    return await res.json();
}

function getMonthUptimePercentage(year, month, incidents) {

    const monthIncidents = incidents.filter(incident => {
        const incidentYear = incident.date.slice(0, 4);
        if (incidentYear !== year.toString()) {
            return false;
        }

        const incidentMonth = incident.date.slice(5, 7);
        if (incidentMonth !== paddedNumber(month + 1)) {
            return false;
        }

        return true;
    });

    const outageMinutes = monthIncidents.reduce((acc, incident) => acc + incident.outageMinutes, 0);
    const monthMinutes = new Date(year, month + 1, 0).getDate() * 24 * 60;

    const uptime = (1 - outageMinutes / monthMinutes) * 100;

    if (uptime === 100) {
        return uptime.toFixed(0);
    } else {
        return uptime.toFixed(2);
    }
}

function getMonths() {

    const monthIndexes = createMonthIndexes();

    const months = [];

    for (const monthIndex of monthIndexes) {
        const startDate = firstDayOfFirstWeekOfMonth(monthIndex.year, monthIndex.month);
        const endDate = lastDayOfLastWeekOfMonth(monthIndex.year, monthIndex.month);

        const days = [];

        for (let dateCursor = new Date(startDate); dateCursor <= endDate; dateCursor.setDate(dateCursor.getDate() + 1)) {
            days.push(new Date(dateCursor));
        }

        months.push({
            year: monthIndex.year,
            month: monthIndex.month,
            days: days
        });
    }

    return months;
}

function createMonthIndexes() {

    const monthIndexes = [];
    let dateCursor = today = new Date();

    for (let i = 0; i < MAX_CALENDAR_MONTHS; i++) {
        monthIndexes.push({
            year: dateCursor.getFullYear(),
            month: dateCursor.getMonth()
        });
        dateCursor.setMonth(dateCursor.getMonth() - 1);
    }

    return monthIndexes.toReversed();
}

function getIncident(date, incidents) {
    return incidents.find(incident => incident.date === getISOFormattedDate(date));
}

function getISOFormattedDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${paddedNumber(month)}-${paddedNumber(day)}`
}

function paddedNumber(i) {
    if (i > 9) {
        return i.toString();
    } else {
        return '0' + i.toString();
    }
}

function firstDayOfFirstWeekOfMonth(year, month) {

    const firstDayOfMonth = new Date(year, month, 1);

    let firstDayOfWeekOffset = 0;

    if (firstDayOfWeekIsMonday) {

        if (firstDayOfMonth.getDay() === 0) {
            firstDayOfWeekOffset = -6;
        } else {
            firstDayOfWeekOffset = 1;
        }
    }

    return new Date(firstDayOfMonth.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay() + firstDayOfWeekOffset));
}

function lastDayOfLastWeekOfMonth(year, month) {
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let lastDayOfWeekOffset = 0;

    if (firstDayOfWeekIsMonday) {

        if (lastDayOfMonth.getDay() === 0) {
            lastDayOfWeekOffset = -6;
        } else {
            lastDayOfWeekOffset = 1;
        }
    }


    return new Date(lastDayOfMonth.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay() + lastDayOfWeekOffset)));
}

function getMonthName(monthNumber, lang) {
    const n = parseInt(monthNumber);
    switch (n) {
        case 0: return lang === 'sv' ? 'Januari' : 'January';
        case 1: return lang === 'sv' ? 'Februari' : 'February';
        case 2: return 'Mars';
        case 3: return 'April';
        case 4: return lang === 'sv' ? 'Maj' : 'May';
        case 5: return lang === 'sv' ? 'Juni' : 'June';
        case 6: return lang === 'sv' ? 'Juli' : 'July';
        case 7: return lang === 'sv' ? 'Augusti' : 'August';
        case 8: return 'September';
        case 9: return lang === 'sv' ? 'Oktober' : 'October';
        case 10: return 'November';
        case 11: return 'December';
    }

    return null;
}