import { waitFor, wait, run } from "./yielder.js";

const log_element = document.querySelector("#log");
function log(strings, ...values) {
    let str = "";
    let args = [];
    let i = 0;
    while (i < strings.length) {
	str += strings[i];
	args.push(strings[i]);
	if (i < values.length) {
	    const v = values[i];
	    if (typeof v == "object") {
		str += JSON.stringify(v, null, "  ");
	    } else {
		str += v;
	    }
	    args.push(v);
	}
	++i;
    }
    log_element.innerText += `${str}\n`;
    console.log(...args);
    return str;
}
console.log("Hello world!");


run(function* main() {
    {
	let counter = 0;
	const button = document.querySelector("#counter");
	button.addEventListener("click", () => {
	    counter++;
	    button.innerText = `Clicked ${counter} times!`;
	});
    }

    {
	let start = false;
	const button = document.querySelector("#starter");
	button.addEventListener("click", () => {
	    start = true;
	    button.disabled = true;
	    button.innerText = "Action Started...";
	});
	yield* waitFor(() => start);
    }
    
    log`ZA WARUDO!!!`;
    log`Fufufu`;
    yield* wait(1000);
    log`1 second has passed`;
    yield* wait(1000);
    log`2 seconds have passed`;
    yield* wait(1000);
    log`3 seconds have passed`;
    yield* wait(500);
    log`It's over Jotaro! I have WON!`;
    yield* wait(500);
    log`ROAD-O ROLLER!!`;
    const url = "https://pokeapi.co/api/v2/pokemon/ditto";
    let result = yield* waitFor(fetch(url));
    if (!result.ok) {
	console.error(result.error);
	return;
    }
    const response = result.value;
    result = yield* waitFor(response.json());
    if (!result.ok) {
	console.error(result.error);
	return;
    }
    const data = result.value;
    log`Requests: ${url}`;
    log`Response: ${data}`;
});

