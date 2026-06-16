import { dev } from "https://cdn.jsdelivr.net/gh/learnpoint/piko@3.1.9/dev.js";

if (Deno.args.length > 0) {
    const port =  Deno.args[0];
    dev({}, port);
} else {
    dev();
}