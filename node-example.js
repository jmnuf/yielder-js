import { waitFor, yielded, Y, wait, run } from "./yielder.js";

const yirum = yielded(fetch);

function randInt(max, min) {
    max = Math.floor(max);
    min = Math.floor(min);
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomPokeID() {
    const max = 1025;
    const min = 1;
    return randInt(max, min);
}

run(function* main() {
    console.log("Hello world!");
    yield* wait(1000);
    console.log("Keep it cool, broski");
    yield* wait(1000);
    const pokeID = randomPokeID();
    console.log(`Searching for pokemon of ID: ${pokeID}`);
    const result = yield* getData(pokeID);
    console.log("Success?", result.ok);
    if (!result.ok) {
	throw result.error;
    }
    const poke = result.value;
    console.log(`Loaded pokemon: ${poke.name}`);
    console.log(poke);
}).catch(console.error);

const getData = Y(function* getData(pmI) {
    const url = `https://pokeapi.co/api/v2/pokemon/${pmI}`;
    return yield* yirum(url)
	.pipe(res => waitFor(res.json()))
	.pipe(pokemon => {
	    const abilities = collectAbilities(pokemon);
	    const stats = collectBaseStats(pokemon);

	    const data = {
		id: pokemon.id,
		name: pokemon.name,
		order: pokemon.order,
		abilities: abilities,
		stats: stats,
		height: pokemon.height,
		weight: pokemon.weight,
	    };

	    return data;
	});
});

function collectAbilities(pokemon) {
    const abilities = {};
    for (const x of pokemon.abilities) {
	if (typeof x != "object") continue;
	if (typeof x.ability != "object") continue;
	const ability = x.ability;
	const url = ability.url;
	abilities[ability.name] = {
	    name: ability.name,
	    slot: x.slot,
	    is_hidden: x.is_hidden,
	};
    }
    return abilities;
}
function collectBaseStats(pokemon) {
    const stats = {};
    for (const x of pokemon.stats) {
	if (typeof x != "object") continue;
	if (typeof x.stat != "object") continue;
	const name = x.stat.name;
	stats[name] = {
	    base_value: x.base_stat,
	    effort: x.effort,
	};
    }
    return stats;
}

