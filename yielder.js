const GeneratorFunction = (function*() {}).constructor;

function looksLikeResult(x) {
    if (typeof x !== "object" || typeof x.ok !== "boolean") {
	return false;
    }
    if (x.ok) return "value" in x;
    return "error" in x;
}

class Yielder {
    #it
    #valid
    
    constructor(it) {
	if (it instanceof Yielder) {
	    this.#it = it.#it;
	} else {
	    this.#it = it;
	}
	this.#valid = true;
    }

    get isValid() {
	return this.#valid;
    }

    next() {
	if (!this.#valid) {
	    throw new Error("Attempting to run invalidated yielder");
	}
	try {
	    const step = this.#it.next();
	    if (step.done) {
		if (looksLikeResult(step.value)) {
		    return { value: step.value, done: true };
		}
		const value = { ok: true, value: step.value };
		return { value, done: true };
	    }
	    return step;
	} catch (e) {
	    return { value: { ok: false, error: e }, done: true };
	}
    }

    *[Symbol.iterator]() {
	if (!this.#valid) {
	    throw new Error("Attempting to run invalidated yielder");
	}
	let step = this.next();
	while (!step.done) {
	    yield step.value;
	    step = this.next();
	}
	return step.value;
    }

    pipe(fn) {
	function* piped(it, cb) {
	    try {
		const a = yield* it;
		let va = a;
		if (looksLikeResult(a)) {
		    if (!a.ok) {
			throw a.error;
		    }
		    va = a.value;
		}
		let b;
		if (cb instanceof GeneratorFunction) {
		    b = yield* cb(va);
		} else if (typeof cb == "function") {
		    b = cb(va);
		} else {
		    throw new TypeError(`Unexpected callback type: ${typeof cb}`);
		}
		if (b instanceof GeneratorFunction || b instanceof Yielder) {
		    b = yield* b;
		}
		if (looksLikeResult(b)) {
		    return b;
		}
		return { ok: true, value: b };
	    } catch (e) {
		return { ok: false, error: e };
	    }
	}
	this.#valid = false;
	return new Yielder(piped(this.#it, fn));
    }
}
export function Y(gfn) {
    return (...args) => new Yielder(gfn(...args));
}

export function yielded(fn) {
    return (...args) => {
	const it = yieldPromise(fn(...args));
	return new Yielder(it);
    }
}

export function wait(ms) {
    return yieldPromise(
	new Promise((res) => setTimeout(res, ms))
    );
}

export const yieldPromise = Y(function* yieldPromise(promise) {
    let done = false;
    const result = {};
    promise.then((value) => {
	done = true;
	result.ok = true;
	result.value = value;
    }).catch((error) => {
	done = true;
	result.ok = false;
	result.error = error;
    });

    while (!done) {
	yield;
    }
    
    return result;
})

export function callYield(it, cb) {
    try {
	let x = it.next();
	if (x.done) {
	    if (typeof cb === "function") cb({ ok: true, value: x.value });
	    return;
	}
	setTimeout(callYield, 0, it, cb);
    } catch (err) {
	cb({ ok: false, error: err });
    }
}
export function promiseYield(it, cb) {
    return new Promise((res, rej) => {
	callYield(it, result => {
	    if (result.ok) {
		res(result.value);
	    } else {
		rej(result.error);
	    }
	});
    });
};
export function run(fn, ...args) {
    return promiseYield(fn(...args));
}

export function promisifyYielder(fn) {
    return async function(...args) {
	const it = fn(...args);
	let x = it.next();
	while (!x.done) {
	    await new Promise(res => setTimeout(res, 0));
	    x = it.next();
	}
	return x.value;
    };
}

export const waitFor = Y(function* waitEvent(fn, ...args) {
    if (fn instanceof Promise) {
	return yield* yieldPromise(fn);
    }
    let x = fn(...args);
    if (typeof x != "boolean" && !(x instanceof GeneratorFunction) && !(x instanceof Promise)) {
	throw new TypeError(`Passed function must return either a boolean, a Promise or a Generator but got ${typeof x}`);
    }
    if (x instanceof GeneratorFunction || x instanceof Yielder) {
	return yield* x;
    }
    if (x instanceof Promise) {
	return yield* yieldPromise(x);
    }
    if (x) return true;
    else yield false;
    
    while (!fn(...args)) {
	yield false;
    }
    return true;
});

