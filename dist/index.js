(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Svelteit = {}));
}(this, (function (exports) { 'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_options(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            option.selected = ~value.indexOf(option.__value);
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src/Alert.svelte generated by Svelte v3.29.4 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1rs359d-style";
    	style.textContent = ".alert.svelte-1rs359d.svelte-1rs359d{padding:20px;background-color:#f4e6ff;color:black}.alert.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#0f001a;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#b24dff}.alert.primary.svelte-1rs359d.svelte-1rs359d{background-color:#9100ff;color:white}.alert.primary.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.primary.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#9100ff;border:1px solid #9100ff}.alert.primary.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#9100ff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.primary.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#d399ff}.alert.primary.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.primary.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#3a0066}.alert.secondary.svelte-1rs359d.svelte-1rs359d{background-color:#826c93;color:white}.alert.secondary.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.secondary.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#826c93;border:1px solid #826c93}.alert.secondary.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#826c93;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.secondary.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#cdc4d4}.alert.secondary.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.secondary.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#342b3b}.alert.success.svelte-1rs359d.svelte-1rs359d{background-color:#47c639;color:white}.alert.success.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.success.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#47c639;border:1px solid #47c639}.alert.success.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#47c639;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.success.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#b5e8b0}.alert.success.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.success.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#1c4f17}.alert.danger.svelte-1rs359d.svelte-1rs359d{background-color:#ff006e;color:white}.alert.danger.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.danger.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#ff006e;border:1px solid #ff006e}.alert.danger.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ff006e;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.danger.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#ff99c5}.alert.danger.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.danger.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#66002c}.alert.warning.svelte-1rs359d.svelte-1rs359d{background-color:#ffa600;color:white}.alert.warning.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.warning.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#ffa600;border:1px solid #ffa600}.alert.warning.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffa600;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.warning.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#ffdc99}.alert.warning.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.warning.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#664300}.alert.info.svelte-1rs359d.svelte-1rs359d{background-color:#00d8ff;color:white}.alert.info.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.info.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#00d8ff;border:1px solid #00d8ff}.alert.info.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#00d8ff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.info.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#99f0ff}.alert.info.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.info.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#005766}.alert.light.svelte-1rs359d.svelte-1rs359d{background-color:#f4e6ff;color:black}.alert.light.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.light.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#0f001a;border:1px solid #f4e6ff}.alert.light.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#0f001a;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.light.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#6600b3}.alert.light.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#0f001a;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.light.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#6600b3}.alert.dark.svelte-1rs359d.svelte-1rs359d{background-color:#0f001a;color:white}.alert.dark.rounded.svelte-1rs359d.svelte-1rs359d{border-radius:4px}.alert.dark.outlined.svelte-1rs359d.svelte-1rs359d{background-color:#ffffff;color:#0f001a;border:1px solid #0f001a}.alert.dark.outlined.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#0f001a;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.dark.outlined.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#6600b3}.alert.dark.svelte-1rs359d .dismissible.svelte-1rs359d{margin-left:15px;color:#ffffff;font-weight:bold;font-size:20px;float:right;line-height:1.3;cursor:pointer;transition:0.2s}.alert.dark.svelte-1rs359d .dismissible.svelte-1rs359d:hover{color:#b3b3b3}";
    	append(document.head, style);
    }

    // (286:0) {#if visible}
    function create_if_block(ctx) {
    	let div;
    	let t;
    	let div_transition;
    	let current;
    	let if_block = /*dismissible*/ ctx[0] && create_if_block_1(ctx);
    	const default_slot_template = /*#slots*/ ctx[14].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[13], null);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "alert svelte-1rs359d");
    			toggle_class(div, "primary", /*primary*/ ctx[1]);
    			toggle_class(div, "secondary", /*secondary*/ ctx[2]);
    			toggle_class(div, "success", /*success*/ ctx[3]);
    			toggle_class(div, "danger", /*danger*/ ctx[4]);
    			toggle_class(div, "warning", /*warning*/ ctx[5]);
    			toggle_class(div, "info", /*info*/ ctx[6]);
    			toggle_class(div, "light", /*light*/ ctx[7]);
    			toggle_class(div, "dark", /*dark*/ ctx[8]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[9]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[10]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*dismissible*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8192) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[13], dirty, null, null);
    				}
    			}

    			if (dirty & /*primary*/ 2) {
    				toggle_class(div, "primary", /*primary*/ ctx[1]);
    			}

    			if (dirty & /*secondary*/ 4) {
    				toggle_class(div, "secondary", /*secondary*/ ctx[2]);
    			}

    			if (dirty & /*success*/ 8) {
    				toggle_class(div, "success", /*success*/ ctx[3]);
    			}

    			if (dirty & /*danger*/ 16) {
    				toggle_class(div, "danger", /*danger*/ ctx[4]);
    			}

    			if (dirty & /*warning*/ 32) {
    				toggle_class(div, "warning", /*warning*/ ctx[5]);
    			}

    			if (dirty & /*info*/ 64) {
    				toggle_class(div, "info", /*info*/ ctx[6]);
    			}

    			if (dirty & /*light*/ 128) {
    				toggle_class(div, "light", /*light*/ ctx[7]);
    			}

    			if (dirty & /*dark*/ 256) {
    				toggle_class(div, "dark", /*dark*/ ctx[8]);
    			}

    			if (dirty & /*rounded*/ 512) {
    				toggle_class(div, "rounded", /*rounded*/ ctx[9]);
    			}

    			if (dirty & /*outlined*/ 1024) {
    				toggle_class(div, "outlined", /*outlined*/ ctx[10]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);

    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};
    }

    // (300:4) {#if dismissible}
    function create_if_block_1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "×";
    			attr(span, "class", "svelte-1rs359d");
    			toggle_class(span, "dismissible", /*dismissible*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (!mounted) {
    				dispose = listen(span, "click", /*handleClick*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*dismissible*/ 1) {
    				toggle_class(span, "dismissible", /*dismissible*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*visible*/ ctx[11] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*visible*/ ctx[11]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 2048) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let visible = true;
    	let { dismissible = false } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { rounded = false } = $$props;
    	let { outlined = false } = $$props;

    	const handleClick = () => {
    		$$invalidate(11, visible = !visible);
    	};

    	$$self.$$set = $$props => {
    		if ("dismissible" in $$props) $$invalidate(0, dismissible = $$props.dismissible);
    		if ("primary" in $$props) $$invalidate(1, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(2, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(3, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(4, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(5, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(6, info = $$props.info);
    		if ("light" in $$props) $$invalidate(7, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(8, dark = $$props.dark);
    		if ("rounded" in $$props) $$invalidate(9, rounded = $$props.rounded);
    		if ("outlined" in $$props) $$invalidate(10, outlined = $$props.outlined);
    		if ("$$scope" in $$props) $$invalidate(13, $$scope = $$props.$$scope);
    	};

    	return [
    		dismissible,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		rounded,
    		outlined,
    		visible,
    		handleClick,
    		$$scope,
    		slots
    	];
    }

    class Alert extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1rs359d-style")) add_css();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			dismissible: 0,
    			primary: 1,
    			secondary: 2,
    			success: 3,
    			danger: 4,
    			warning: 5,
    			info: 6,
    			light: 7,
    			dark: 8,
    			rounded: 9,
    			outlined: 10
    		});
    	}
    }

    /* src/Button.svelte generated by Svelte v3.29.4 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-frstzj-style";
    	style.textContent = ".svelteit-button.svelte-frstzj{cursor:pointer;justify-content:center;padding-bottom:calc(0.8em - 1px);padding-left:1.2em;padding-right:1.2em;padding-top:calc(0.8em - 1px);text-align:center;white-space:nowrap;border-radius:0px;border:1px solid #f4e6ff;font-size:unset}.svelteit-button.init.svelte-frstzj{background-color:#f4f4f4;border-color:#f4e6ff;color:white}.svelteit-button.init.svelte-frstzj:hover{background-color:rgba(244, 244, 244, 0.8)}.svelteit-button.init.svelte-frstzj:active{box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;transform:translateY(1px);outline:none;background-color:rgba(244, 244, 244, 0.8)}.svelteit-button.init.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;background-color:rgba(244, 244, 244, 0.8)}.svelteit-button.init.outlined.svelte-frstzj{background-color:#f4f4f4;border-color:#f4e6ff;color:#0f001a}.svelteit-button.init.outlined.svelte-frstzj:hover{background-color:rgba(244, 244, 244, 0.1)}.svelteit-button.init.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;transform:translateY(1px);outline:none}.svelteit-button.init.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff}.svelteit-button.primary.svelte-frstzj{background-color:#9100ff;border-color:#9100ff;color:white}.svelteit-button.primary.svelte-frstzj:hover{background-color:rgba(145, 0, 255, 0.8)}.svelteit-button.primary.svelte-frstzj:active{box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;transform:translateY(1px);outline:none;background-color:rgba(145, 0, 255, 0.8)}.svelteit-button.primary.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;background-color:rgba(145, 0, 255, 0.8)}.svelteit-button.primary.outlined.svelte-frstzj{background-color:#ffffff;border-color:#9100ff;color:#9100ff}.svelteit-button.primary.outlined.svelte-frstzj:hover{background-color:rgba(145, 0, 255, 0.1)}.svelteit-button.primary.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;transform:translateY(1px);outline:none;background-color:rgba(145, 0, 255, 0.1)}.svelteit-button.primary.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;background-color:rgba(145, 0, 255, 0.1)}.svelteit-button.secondary.svelte-frstzj{background-color:#826c93;border-color:#826c93;color:#ffffff}.svelteit-button.secondary.svelte-frstzj:hover{background-color:rgba(130, 108, 147, 0.8)}.svelteit-button.secondary.svelte-frstzj:active{box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;transform:translateY(1px);outline:none;background-color:rgba(130, 108, 147, 0.8)}.svelteit-button.secondary.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;background-color:rgba(130, 108, 147, 0.8)}.svelteit-button.secondary.outlined.svelte-frstzj{background-color:#ffffff;border-color:#826c93;color:#826c93}.svelteit-button.secondary.outlined.svelte-frstzj:hover{background-color:rgba(130, 108, 147, 0.1)}.svelteit-button.secondary.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;transform:translateY(1px);outline:none;background-color:rgba(130, 108, 147, 0.1)}.svelteit-button.secondary.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;background-color:rgba(130, 108, 147, 0.1)}.svelteit-button.success.svelte-frstzj{background-color:#47c639;border-color:#47c639;color:#ffffff}.svelteit-button.success.svelte-frstzj:hover{background-color:rgba(71, 198, 57, 0.8)}.svelteit-button.success.svelte-frstzj:active{box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;transform:translateY(1px);outline:none;background-color:rgba(71, 198, 57, 0.8)}.svelteit-button.success.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;background-color:rgba(71, 198, 57, 0.8)}.svelteit-button.success.outlined.svelte-frstzj{background-color:#ffffff;border-color:#47c639;color:#47c639}.svelteit-button.success.outlined.svelte-frstzj:hover{background-color:rgba(71, 198, 57, 0.1)}.svelteit-button.success.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;transform:translateY(1px);outline:none;background-color:rgba(71, 198, 57, 0.1)}.svelteit-button.success.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;background-color:rgba(71, 198, 57, 0.1)}.svelteit-button.danger.svelte-frstzj{background-color:#ff006e;border-color:#ff006e;color:#ffffff}.svelteit-button.danger.svelte-frstzj:hover{background-color:rgba(255, 0, 110, 0.8)}.svelteit-button.danger.svelte-frstzj:active{box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;transform:translateY(1px);outline:none;background-color:rgba(255, 0, 110, 0.8)}.svelteit-button.danger.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;background-color:rgba(255, 0, 110, 0.8)}.svelteit-button.danger.outlined.svelte-frstzj{background-color:#ffffff;border-color:#ff006e;color:#ff006e}.svelteit-button.danger.outlined.svelte-frstzj:hover{background-color:rgba(255, 0, 110, 0.1)}.svelteit-button.danger.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;transform:translateY(1px);outline:none;background-color:rgba(255, 0, 110, 0.1)}.svelteit-button.danger.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;background-color:rgba(255, 0, 110, 0.1)}.svelteit-button.warning.svelte-frstzj{background-color:#ffa600;border-color:#ffa600;color:#ffffff}.svelteit-button.warning.svelte-frstzj:hover{background-color:rgba(255, 166, 0, 0.8)}.svelteit-button.warning.svelte-frstzj:active{box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;transform:translateY(1px);outline:none;background-color:rgba(255, 166, 0, 0.8)}.svelteit-button.warning.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;background-color:rgba(255, 166, 0, 0.8)}.svelteit-button.warning.outlined.svelte-frstzj{background-color:#ffffff;border-color:#ffa600;color:#ffa600}.svelteit-button.warning.outlined.svelte-frstzj:hover{background-color:rgba(255, 166, 0, 0.1)}.svelteit-button.warning.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;transform:translateY(1px);outline:none;background-color:rgba(255, 166, 0, 0.1)}.svelteit-button.warning.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;background-color:rgba(255, 166, 0, 0.1)}.svelteit-button.info.svelte-frstzj{background-color:#00d8ff;border-color:#00d8ff;color:#ffffff}.svelteit-button.info.svelte-frstzj:hover{background-color:rgba(0, 216, 255, 0.8)}.svelteit-button.info.svelte-frstzj:active{box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;transform:translateY(1px);outline:none;background-color:rgba(0, 216, 255, 0.8)}.svelteit-button.info.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;background-color:rgba(0, 216, 255, 0.8)}.svelteit-button.info.outlined.svelte-frstzj{background-color:#ffffff;border-color:#00d8ff;color:#00d8ff}.svelteit-button.info.outlined.svelte-frstzj:hover{background-color:rgba(0, 216, 255, 0.1)}.svelteit-button.info.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;transform:translateY(1px);outline:none;background-color:rgba(0, 216, 255, 0.1)}.svelteit-button.info.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;background-color:rgba(0, 216, 255, 0.1)}.svelteit-button.light.svelte-frstzj{background-color:#f4e6ff;border-color:#f4e6ff;color:#0f001a}.svelteit-button.light.svelte-frstzj:hover{background-color:rgba(244, 230, 255, 0.8)}.svelteit-button.light.svelte-frstzj:active{box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;transform:translateY(1px);outline:none;background-color:rgba(244, 230, 255, 0.8)}.svelteit-button.light.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;background-color:rgba(244, 230, 255, 0.8)}.svelteit-button.light.outlined.svelte-frstzj{background-color:#ffffff;border-color:#f4e6ff;color:#0f001a}.svelteit-button.light.outlined.svelte-frstzj:hover{background-color:rgba(244, 230, 255, 0.1)}.svelteit-button.light.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;transform:translateY(1px);outline:none;background-color:rgba(244, 230, 255, 0.1)}.svelteit-button.light.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;background-color:rgba(244, 230, 255, 0.1)}.svelteit-button.dark.svelte-frstzj{background-color:#0f001a;border-color:#0f001a;color:#ffffff}.svelteit-button.dark.svelte-frstzj:hover{background-color:rgba(15, 0, 26, 0.8)}.svelteit-button.dark.svelte-frstzj:active{box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;transform:translateY(1px);outline:none;background-color:rgba(15, 0, 26, 0.8)}.svelteit-button.dark.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;background-color:rgba(15, 0, 26, 0.8)}.svelteit-button.dark.outlined.svelte-frstzj{background-color:#ffffff;border-color:#0f001a;color:#0f001a}.svelteit-button.dark.outlined.svelte-frstzj:hover{background-color:rgba(15, 0, 26, 0.1)}.svelteit-button.dark.outlined.svelte-frstzj:active{box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;transform:translateY(1px);outline:none;background-color:rgba(15, 0, 26, 0.1)}.svelteit-button.dark.outlined.svelte-frstzj:focus{outline:none;box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;background-color:rgba(15, 0, 26, 0.1)}.svelteit-button.rounded.svelte-frstzj{border-radius:4px}.svelteit-button.block.svelte-frstzj{display:inline-block;width:100%}.svelteit-button.small.svelte-frstzj{padding:2px 7px;font-size:12px}.svelteit-button.medium.svelte-frstzj{padding:5px 10px;font-size:15px}.svelteit-button.large.svelte-frstzj{padding:12px 32px;line-height:1.5;font-size:18px}.svelteit-button.disabled.svelte-frstzj{border-color:#f4e6ff;background-color:#f4e6ff;color:black;border:1px solid transparent}.svelteit-button.disabled.svelte-frstzj:hover{background-color:#f4e6ff;color:black;cursor:not-allowed;border:1px solid transparent}";
    	append(document.head, style);
    }

    // (351:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], null);
    	const default_slot_or_fallback = default_slot || fallback_block();

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 524288) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[19], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (349:2) {#if title}
    function create_if_block$1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*title*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (352:10)        
    function fallback_block(ctx) {
    	let em;

    	return {
    		c() {
    			em = element("em");
    			em.textContent = "Button is empty";
    		},
    		m(target, anchor) {
    			insert(target, em, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(em);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let button;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*title*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let button_levels = [{ type: /*type*/ ctx[17] }, { class: "svelteit-button" }, /*$$props*/ ctx[18]];
    	let button_data = {};

    	for (let i = 0; i < button_levels.length; i += 1) {
    		button_data = assign(button_data, button_levels[i]);
    	}

    	return {
    		c() {
    			button = element("button");
    			if_block.c();
    			set_attributes(button, button_data);
    			toggle_class(button, "primary", /*primary*/ ctx[1]);
    			toggle_class(button, "secondary", /*secondary*/ ctx[2]);
    			toggle_class(button, "success", /*success*/ ctx[3]);
    			toggle_class(button, "danger", /*danger*/ ctx[4]);
    			toggle_class(button, "warning", /*warning*/ ctx[5]);
    			toggle_class(button, "info", /*info*/ ctx[6]);
    			toggle_class(button, "light", /*light*/ ctx[7]);
    			toggle_class(button, "dark", /*dark*/ ctx[8]);
    			toggle_class(button, "outline", /*outline*/ ctx[10]);
    			toggle_class(button, "small", /*small*/ ctx[11]);
    			toggle_class(button, "medium", /*medium*/ ctx[12]);
    			toggle_class(button, "large", /*large*/ ctx[13]);
    			toggle_class(button, "disabled", /*disabled*/ ctx[9]);
    			toggle_class(button, "outlined", /*outlined*/ ctx[14]);
    			toggle_class(button, "rounded", /*rounded*/ ctx[15]);
    			toggle_class(button, "block", /*block*/ ctx[16]);
    			toggle_class(button, "svelte-frstzj", true);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			if_blocks[current_block_type_index].m(button, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[21]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(button, null);
    			}

    			set_attributes(button, button_data = get_spread_update(button_levels, [
    				(!current || dirty & /*type*/ 131072) && { type: /*type*/ ctx[17] },
    				{ class: "svelteit-button" },
    				dirty & /*$$props*/ 262144 && /*$$props*/ ctx[18]
    			]));

    			toggle_class(button, "primary", /*primary*/ ctx[1]);
    			toggle_class(button, "secondary", /*secondary*/ ctx[2]);
    			toggle_class(button, "success", /*success*/ ctx[3]);
    			toggle_class(button, "danger", /*danger*/ ctx[4]);
    			toggle_class(button, "warning", /*warning*/ ctx[5]);
    			toggle_class(button, "info", /*info*/ ctx[6]);
    			toggle_class(button, "light", /*light*/ ctx[7]);
    			toggle_class(button, "dark", /*dark*/ ctx[8]);
    			toggle_class(button, "outline", /*outline*/ ctx[10]);
    			toggle_class(button, "small", /*small*/ ctx[11]);
    			toggle_class(button, "medium", /*medium*/ ctx[12]);
    			toggle_class(button, "large", /*large*/ ctx[13]);
    			toggle_class(button, "disabled", /*disabled*/ ctx[9]);
    			toggle_class(button, "outlined", /*outlined*/ ctx[14]);
    			toggle_class(button, "rounded", /*rounded*/ ctx[15]);
    			toggle_class(button, "block", /*block*/ ctx[16]);
    			toggle_class(button, "svelte-frstzj", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { title = undefined } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { disabled = false } = $$props;
    	let { outline = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { block = false } = $$props;
    	let { type = "button" } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(18, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("title" in $$new_props) $$invalidate(0, title = $$new_props.title);
    		if ("primary" in $$new_props) $$invalidate(1, primary = $$new_props.primary);
    		if ("secondary" in $$new_props) $$invalidate(2, secondary = $$new_props.secondary);
    		if ("success" in $$new_props) $$invalidate(3, success = $$new_props.success);
    		if ("danger" in $$new_props) $$invalidate(4, danger = $$new_props.danger);
    		if ("warning" in $$new_props) $$invalidate(5, warning = $$new_props.warning);
    		if ("info" in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ("light" in $$new_props) $$invalidate(7, light = $$new_props.light);
    		if ("dark" in $$new_props) $$invalidate(8, dark = $$new_props.dark);
    		if ("disabled" in $$new_props) $$invalidate(9, disabled = $$new_props.disabled);
    		if ("outline" in $$new_props) $$invalidate(10, outline = $$new_props.outline);
    		if ("small" in $$new_props) $$invalidate(11, small = $$new_props.small);
    		if ("medium" in $$new_props) $$invalidate(12, medium = $$new_props.medium);
    		if ("large" in $$new_props) $$invalidate(13, large = $$new_props.large);
    		if ("outlined" in $$new_props) $$invalidate(14, outlined = $$new_props.outlined);
    		if ("rounded" in $$new_props) $$invalidate(15, rounded = $$new_props.rounded);
    		if ("block" in $$new_props) $$invalidate(16, block = $$new_props.block);
    		if ("type" in $$new_props) $$invalidate(17, type = $$new_props.type);
    		if ("$$scope" in $$new_props) $$invalidate(19, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		title,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		disabled,
    		outline,
    		small,
    		medium,
    		large,
    		outlined,
    		rounded,
    		block,
    		type,
    		$$props,
    		$$scope,
    		slots,
    		click_handler
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-frstzj-style")) add_css$1();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			title: 0,
    			primary: 1,
    			secondary: 2,
    			success: 3,
    			danger: 4,
    			warning: 5,
    			info: 6,
    			light: 7,
    			dark: 8,
    			disabled: 9,
    			outline: 10,
    			small: 11,
    			medium: 12,
    			large: 13,
    			outlined: 14,
    			rounded: 15,
    			block: 16,
    			type: 17
    		});
    	}
    }

    /* src/ButtonGroup.svelte generated by Svelte v3.29.4 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1jgecax-style";
    	style.textContent = ".svelteit-button-group.svelte-1jgecax{position:relative;display:-ms-inline-flexbox;display:inline-flex;vertical-align:middle}.svelteit-button-group.svelte-1jgecax>button:not(:first-child){border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px}.svelteit-button-group.svelte-1jgecax>button:not(:last-child){border-top-right-radius:0;border-bottom-right-radius:0;margin-right:0px}.svelteit-button-group.svelte-1jgecax button:first-child{margin-left:0}.svelteit-button-group.svelte-1jgecax button:last-child{margin-right:0}.svelteit-button-group.svelte-1jgecax button{border-radius:4px}.svelteit-button-group.svelte-1jgecax button:focus{border:1px solid inherit;margin-right:0}";
    	append(document.head, style);
    }

    // (65:8)      
    function fallback_block$1(ctx) {
    	let em;

    	return {
    		c() {
    			em = element("em");
    			em.textContent = "ButtonGroup is empty";
    		},
    		m(target, anchor) {
    			insert(target, em, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(em);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[18].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[17], null);
    	const default_slot_or_fallback = default_slot || fallback_block$1();
    	let div_levels = [{ class: "svelteit-button-group" }, { role: "group" }, /*$$props*/ ctx[16]];
    	let div_data = {};

    	for (let i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			set_attributes(div, div_data);
    			toggle_class(div, "primary", /*primary*/ ctx[0]);
    			toggle_class(div, "secondary", /*secondary*/ ctx[1]);
    			toggle_class(div, "success", /*success*/ ctx[2]);
    			toggle_class(div, "danger", /*danger*/ ctx[3]);
    			toggle_class(div, "warning", /*warning*/ ctx[4]);
    			toggle_class(div, "info", /*info*/ ctx[5]);
    			toggle_class(div, "light", /*light*/ ctx[6]);
    			toggle_class(div, "dark", /*dark*/ ctx[7]);
    			toggle_class(div, "outline", /*outline*/ ctx[9]);
    			toggle_class(div, "small", /*small*/ ctx[10]);
    			toggle_class(div, "medium", /*medium*/ ctx[11]);
    			toggle_class(div, "large", /*large*/ ctx[12]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[8]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[13]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[14]);
    			toggle_class(div, "block", /*block*/ ctx[15]);
    			toggle_class(div, "svelte-1jgecax", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 131072) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[17], dirty, null, null);
    				}
    			}

    			set_attributes(div, div_data = get_spread_update(div_levels, [
    				{ class: "svelteit-button-group" },
    				{ role: "group" },
    				dirty & /*$$props*/ 65536 && /*$$props*/ ctx[16]
    			]));

    			toggle_class(div, "primary", /*primary*/ ctx[0]);
    			toggle_class(div, "secondary", /*secondary*/ ctx[1]);
    			toggle_class(div, "success", /*success*/ ctx[2]);
    			toggle_class(div, "danger", /*danger*/ ctx[3]);
    			toggle_class(div, "warning", /*warning*/ ctx[4]);
    			toggle_class(div, "info", /*info*/ ctx[5]);
    			toggle_class(div, "light", /*light*/ ctx[6]);
    			toggle_class(div, "dark", /*dark*/ ctx[7]);
    			toggle_class(div, "outline", /*outline*/ ctx[9]);
    			toggle_class(div, "small", /*small*/ ctx[10]);
    			toggle_class(div, "medium", /*medium*/ ctx[11]);
    			toggle_class(div, "large", /*large*/ ctx[12]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[8]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[13]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[14]);
    			toggle_class(div, "block", /*block*/ ctx[15]);
    			toggle_class(div, "svelte-1jgecax", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { disabled = false } = $$props;
    	let { outline = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { block = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(16, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("primary" in $$new_props) $$invalidate(0, primary = $$new_props.primary);
    		if ("secondary" in $$new_props) $$invalidate(1, secondary = $$new_props.secondary);
    		if ("success" in $$new_props) $$invalidate(2, success = $$new_props.success);
    		if ("danger" in $$new_props) $$invalidate(3, danger = $$new_props.danger);
    		if ("warning" in $$new_props) $$invalidate(4, warning = $$new_props.warning);
    		if ("info" in $$new_props) $$invalidate(5, info = $$new_props.info);
    		if ("light" in $$new_props) $$invalidate(6, light = $$new_props.light);
    		if ("dark" in $$new_props) $$invalidate(7, dark = $$new_props.dark);
    		if ("disabled" in $$new_props) $$invalidate(8, disabled = $$new_props.disabled);
    		if ("outline" in $$new_props) $$invalidate(9, outline = $$new_props.outline);
    		if ("small" in $$new_props) $$invalidate(10, small = $$new_props.small);
    		if ("medium" in $$new_props) $$invalidate(11, medium = $$new_props.medium);
    		if ("large" in $$new_props) $$invalidate(12, large = $$new_props.large);
    		if ("outlined" in $$new_props) $$invalidate(13, outlined = $$new_props.outlined);
    		if ("rounded" in $$new_props) $$invalidate(14, rounded = $$new_props.rounded);
    		if ("block" in $$new_props) $$invalidate(15, block = $$new_props.block);
    		if ("$$scope" in $$new_props) $$invalidate(17, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		disabled,
    		outline,
    		small,
    		medium,
    		large,
    		outlined,
    		rounded,
    		block,
    		$$props,
    		$$scope,
    		slots
    	];
    }

    class ButtonGroup extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1jgecax-style")) add_css$2();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			primary: 0,
    			secondary: 1,
    			success: 2,
    			danger: 3,
    			warning: 4,
    			info: 5,
    			light: 6,
    			dark: 7,
    			disabled: 8,
    			outline: 9,
    			small: 10,
    			medium: 11,
    			large: 12,
    			outlined: 13,
    			rounded: 14,
    			block: 15
    		});
    	}
    }

    /* src/Card.svelte generated by Svelte v3.29.4 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-5w6d3j-style";
    	style.textContent = ".svelteit-card.svelte-5w6d3j.svelte-5w6d3j{transition:0.2s;border-radius:4px;cursor:pointer;color:#0f001a;background-color:#ffffff;margin-bottom:10px}.svelteit-card.svelte-5w6d3j.svelte-5w6d3j:hover{box-shadow:0 8px 16px 0 rgba(15, 0, 26, 0.2)}.svelteit-card.svelte-5w6d3j .svelteit-card-container.svelte-5w6d3j{padding:2px 16px}.svelteit-card.svelte-5w6d3j .svelteit-card-container h3.svelte-5w6d3j{margin:15px auto 5px auto;font-size:22px}";
    	append(document.head, style);
    }

    // (62:2) {#if image}
    function create_if_block_3(ctx) {
    	let img;
    	let img_src_value;

    	return {
    		c() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*image*/ ctx[2])) attr(img, "src", img_src_value);
    			attr(img, "alt", /*title*/ ctx[0]);
    			set_style(img, "width", "100%");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*image*/ 4 && img.src !== (img_src_value = /*image*/ ctx[2])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*title*/ 1) {
    				attr(img, "alt", /*title*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    		}
    	};
    }

    // (66:4) {#if title}
    function create_if_block_2(ctx) {
    	let h3;
    	let t;

    	return {
    		c() {
    			h3 = element("h3");
    			t = text(/*title*/ ctx[0]);
    			attr(h3, "class", "svelte-5w6d3j");
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			append(h3, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    		}
    	};
    }

    // (69:4) {#if description}
    function create_if_block_1$1(ctx) {
    	let p;
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(/*description*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*description*/ 2) set_data(t, /*description*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (72:4) {#if buttonRoute}
    function create_if_block$2(ctx) {
    	let p;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				disabled: /*disabled*/ ctx[13],
    				title: /*buttonTitle*/ ctx[4],
    				primary: /*primary*/ ctx[5],
    				secondary: /*secondary*/ ctx[6],
    				success: /*success*/ ctx[7],
    				warning: /*warning*/ ctx[9],
    				info: /*info*/ ctx[10],
    				danger: /*danger*/ ctx[8],
    				light: /*light*/ ctx[11],
    				dark: /*dark*/ ctx[12],
    				outlined: /*outlined*/ ctx[18],
    				rounded: /*rounded*/ ctx[19],
    				small: /*small*/ ctx[15],
    				medium: /*medium*/ ctx[16],
    				large: /*large*/ ctx[17],
    				block: /*block*/ ctx[20]
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*buttonRoute*/ ctx[3])) /*buttonRoute*/ ctx[3].apply(this, arguments);
    	});

    	return {
    		c() {
    			p = element("p");
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			mount_component(button, p, null);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};
    			if (dirty & /*disabled*/ 8192) button_changes.disabled = /*disabled*/ ctx[13];
    			if (dirty & /*buttonTitle*/ 16) button_changes.title = /*buttonTitle*/ ctx[4];
    			if (dirty & /*primary*/ 32) button_changes.primary = /*primary*/ ctx[5];
    			if (dirty & /*secondary*/ 64) button_changes.secondary = /*secondary*/ ctx[6];
    			if (dirty & /*success*/ 128) button_changes.success = /*success*/ ctx[7];
    			if (dirty & /*warning*/ 512) button_changes.warning = /*warning*/ ctx[9];
    			if (dirty & /*info*/ 1024) button_changes.info = /*info*/ ctx[10];
    			if (dirty & /*danger*/ 256) button_changes.danger = /*danger*/ ctx[8];
    			if (dirty & /*light*/ 2048) button_changes.light = /*light*/ ctx[11];
    			if (dirty & /*dark*/ 4096) button_changes.dark = /*dark*/ ctx[12];
    			if (dirty & /*outlined*/ 262144) button_changes.outlined = /*outlined*/ ctx[18];
    			if (dirty & /*rounded*/ 524288) button_changes.rounded = /*rounded*/ ctx[19];
    			if (dirty & /*small*/ 32768) button_changes.small = /*small*/ ctx[15];
    			if (dirty & /*medium*/ 65536) button_changes.medium = /*medium*/ ctx[16];
    			if (dirty & /*large*/ 131072) button_changes.large = /*large*/ ctx[17];
    			if (dirty & /*block*/ 1048576) button_changes.block = /*block*/ ctx[20];
    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    			destroy_component(button);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let current;
    	let if_block0 = /*image*/ ctx[2] && create_if_block_3(ctx);
    	let if_block1 = /*title*/ ctx[0] && create_if_block_2(ctx);
    	let if_block2 = /*description*/ ctx[1] && create_if_block_1$1(ctx);
    	let if_block3 = /*buttonRoute*/ ctx[3] && create_if_block$2(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			attr(div0, "class", "svelteit-card-container svelte-5w6d3j");
    			attr(div1, "class", "svelteit-card svelte-5w6d3j");
    			toggle_class(div1, "primary", /*primary*/ ctx[5]);
    			toggle_class(div1, "secondary", /*secondary*/ ctx[6]);
    			toggle_class(div1, "success", /*success*/ ctx[7]);
    			toggle_class(div1, "danger", /*danger*/ ctx[8]);
    			toggle_class(div1, "warning", /*warning*/ ctx[9]);
    			toggle_class(div1, "info", /*info*/ ctx[10]);
    			toggle_class(div1, "light", /*light*/ ctx[11]);
    			toggle_class(div1, "dark", /*dark*/ ctx[12]);
    			toggle_class(div1, "outline", /*outline*/ ctx[14]);
    			toggle_class(div1, "small", /*small*/ ctx[15]);
    			toggle_class(div1, "medium", /*medium*/ ctx[16]);
    			toggle_class(div1, "large", /*large*/ ctx[17]);
    			toggle_class(div1, "disabled", /*disabled*/ ctx[13]);
    			toggle_class(div1, "outlined", /*outlined*/ ctx[18]);
    			toggle_class(div1, "rounded", /*rounded*/ ctx[19]);
    			toggle_class(div1, "block", /*block*/ ctx[20]);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block0) if_block0.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			if (if_block1) if_block1.m(div0, null);
    			append(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			append(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*image*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div1, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*title*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*description*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(div0, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*buttonRoute*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*buttonRoute*/ 8) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div0, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*primary*/ 32) {
    				toggle_class(div1, "primary", /*primary*/ ctx[5]);
    			}

    			if (dirty & /*secondary*/ 64) {
    				toggle_class(div1, "secondary", /*secondary*/ ctx[6]);
    			}

    			if (dirty & /*success*/ 128) {
    				toggle_class(div1, "success", /*success*/ ctx[7]);
    			}

    			if (dirty & /*danger*/ 256) {
    				toggle_class(div1, "danger", /*danger*/ ctx[8]);
    			}

    			if (dirty & /*warning*/ 512) {
    				toggle_class(div1, "warning", /*warning*/ ctx[9]);
    			}

    			if (dirty & /*info*/ 1024) {
    				toggle_class(div1, "info", /*info*/ ctx[10]);
    			}

    			if (dirty & /*light*/ 2048) {
    				toggle_class(div1, "light", /*light*/ ctx[11]);
    			}

    			if (dirty & /*dark*/ 4096) {
    				toggle_class(div1, "dark", /*dark*/ ctx[12]);
    			}

    			if (dirty & /*outline*/ 16384) {
    				toggle_class(div1, "outline", /*outline*/ ctx[14]);
    			}

    			if (dirty & /*small*/ 32768) {
    				toggle_class(div1, "small", /*small*/ ctx[15]);
    			}

    			if (dirty & /*medium*/ 65536) {
    				toggle_class(div1, "medium", /*medium*/ ctx[16]);
    			}

    			if (dirty & /*large*/ 131072) {
    				toggle_class(div1, "large", /*large*/ ctx[17]);
    			}

    			if (dirty & /*disabled*/ 8192) {
    				toggle_class(div1, "disabled", /*disabled*/ ctx[13]);
    			}

    			if (dirty & /*outlined*/ 262144) {
    				toggle_class(div1, "outlined", /*outlined*/ ctx[18]);
    			}

    			if (dirty & /*rounded*/ 524288) {
    				toggle_class(div1, "rounded", /*rounded*/ ctx[19]);
    			}

    			if (dirty & /*block*/ 1048576) {
    				toggle_class(div1, "block", /*block*/ ctx[20]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block3);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block3);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { title = undefined } = $$props;
    	let { description = undefined } = $$props;
    	let { image = undefined } = $$props;
    	let { buttonRoute = undefined } = $$props;
    	let { buttonTitle = undefined } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { disabled = false } = $$props;
    	let { outline = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { block = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("description" in $$props) $$invalidate(1, description = $$props.description);
    		if ("image" in $$props) $$invalidate(2, image = $$props.image);
    		if ("buttonRoute" in $$props) $$invalidate(3, buttonRoute = $$props.buttonRoute);
    		if ("buttonTitle" in $$props) $$invalidate(4, buttonTitle = $$props.buttonTitle);
    		if ("primary" in $$props) $$invalidate(5, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(6, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(7, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(8, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(9, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(10, info = $$props.info);
    		if ("light" in $$props) $$invalidate(11, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(12, dark = $$props.dark);
    		if ("disabled" in $$props) $$invalidate(13, disabled = $$props.disabled);
    		if ("outline" in $$props) $$invalidate(14, outline = $$props.outline);
    		if ("small" in $$props) $$invalidate(15, small = $$props.small);
    		if ("medium" in $$props) $$invalidate(16, medium = $$props.medium);
    		if ("large" in $$props) $$invalidate(17, large = $$props.large);
    		if ("outlined" in $$props) $$invalidate(18, outlined = $$props.outlined);
    		if ("rounded" in $$props) $$invalidate(19, rounded = $$props.rounded);
    		if ("block" in $$props) $$invalidate(20, block = $$props.block);
    	};

    	return [
    		title,
    		description,
    		image,
    		buttonRoute,
    		buttonTitle,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		disabled,
    		outline,
    		small,
    		medium,
    		large,
    		outlined,
    		rounded,
    		block
    	];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-5w6d3j-style")) add_css$3();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			title: 0,
    			description: 1,
    			image: 2,
    			buttonRoute: 3,
    			buttonTitle: 4,
    			primary: 5,
    			secondary: 6,
    			success: 7,
    			danger: 8,
    			warning: 9,
    			info: 10,
    			light: 11,
    			dark: 12,
    			disabled: 13,
    			outline: 14,
    			small: 15,
    			medium: 16,
    			large: 17,
    			outlined: 18,
    			rounded: 19,
    			block: 20
    		});
    	}
    }

    /* src/Table.svelte generated by Svelte v3.29.4 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-1hwmmdi-style";
    	style.textContent = ".svelteit-table.svelte-1hwmmdi table.svelte-1hwmmdi{border-radius:4px;border-collapse:collapse;width:100%;color:#0f001a;background-color:#ffffff;font-size:16px;margin:0.1em auto;border-spacing:0}.svelteit-table.svelte-1hwmmdi td, th{padding:10px;text-align:left;border:1px solid #f4e6ff}.svelteit-table.svelte-1hwmmdi .striped tr:nth-child(even){background-color:#f4e6ff}.svelteit-table.svelte-1hwmmdi .hoverable tr:hover :not(th){background-color:#f4e6ff;color:#0f001a}.svelteit-table.svelte-1hwmmdi .borderless thead > tr > th{border:0}.svelteit-table.svelte-1hwmmdi .borderless tbody > tr > td{border:0}.svelteit-table.svelte-1hwmmdi .bordered td, th{border:1px solid #f4e6ff}.svelteit-table.svelte-1hwmmdi .rounded{border:1px solid #f4e6ff;border-radius:4px}.svelteit-table.svelte-1hwmmdi .primary th{background:#9100ff;color:white}.svelteit-table.svelte-1hwmmdi .secondary th{background:#826c93;color:white}.svelteit-table.svelte-1hwmmdi .success th{background:#47c639;color:white}.svelteit-table.svelte-1hwmmdi .warning th{background:#ffa600;color:white}.svelteit-table.svelte-1hwmmdi .info th{background:#00d8ff;color:white}.svelteit-table.svelte-1hwmmdi .light th{background:#f4e6ff;color:black}.svelteit-table.svelte-1hwmmdi .dark th{background:#0f001a;color:white}.responsive.svelte-1hwmmdi.svelte-1hwmmdi{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;-ms-overflow-style:-ms-autohiding-scrollbar}.nowrap.svelte-1hwmmdi.svelte-1hwmmdi{white-space:nowrap}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
    	let div;
    	let table;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	return {
    		c() {
    			div = element("div");
    			table = element("table");
    			if (default_slot) default_slot.c();
    			attr(table, "class", "svelte-1hwmmdi");
    			toggle_class(table, "primary", /*primary*/ ctx[5]);
    			toggle_class(table, "secondary", /*secondary*/ ctx[6]);
    			toggle_class(table, "success", /*success*/ ctx[7]);
    			toggle_class(table, "danger", /*danger*/ ctx[8]);
    			toggle_class(table, "warning", /*warning*/ ctx[9]);
    			toggle_class(table, "info", /*info*/ ctx[10]);
    			toggle_class(table, "light", /*light*/ ctx[11]);
    			toggle_class(table, "dark", /*dark*/ ctx[12]);
    			toggle_class(table, "bordered", /*bordered*/ ctx[0]);
    			toggle_class(table, "borderless", /*borderless*/ ctx[2]);
    			toggle_class(table, "striped", /*striped*/ ctx[4]);
    			toggle_class(table, "rounded", /*rounded*/ ctx[1]);
    			toggle_class(table, "hoverable", /*hoverable*/ ctx[3]);
    			attr(div, "class", "svelteit-table svelte-1hwmmdi");
    			toggle_class(div, "responsive", /*responsive*/ ctx[13]);
    			toggle_class(div, "nowrap", /*nowrap*/ ctx[14]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, table);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32768) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[15], dirty, null, null);
    				}
    			}

    			if (dirty & /*primary*/ 32) {
    				toggle_class(table, "primary", /*primary*/ ctx[5]);
    			}

    			if (dirty & /*secondary*/ 64) {
    				toggle_class(table, "secondary", /*secondary*/ ctx[6]);
    			}

    			if (dirty & /*success*/ 128) {
    				toggle_class(table, "success", /*success*/ ctx[7]);
    			}

    			if (dirty & /*danger*/ 256) {
    				toggle_class(table, "danger", /*danger*/ ctx[8]);
    			}

    			if (dirty & /*warning*/ 512) {
    				toggle_class(table, "warning", /*warning*/ ctx[9]);
    			}

    			if (dirty & /*info*/ 1024) {
    				toggle_class(table, "info", /*info*/ ctx[10]);
    			}

    			if (dirty & /*light*/ 2048) {
    				toggle_class(table, "light", /*light*/ ctx[11]);
    			}

    			if (dirty & /*dark*/ 4096) {
    				toggle_class(table, "dark", /*dark*/ ctx[12]);
    			}

    			if (dirty & /*bordered*/ 1) {
    				toggle_class(table, "bordered", /*bordered*/ ctx[0]);
    			}

    			if (dirty & /*borderless*/ 4) {
    				toggle_class(table, "borderless", /*borderless*/ ctx[2]);
    			}

    			if (dirty & /*striped*/ 16) {
    				toggle_class(table, "striped", /*striped*/ ctx[4]);
    			}

    			if (dirty & /*rounded*/ 2) {
    				toggle_class(table, "rounded", /*rounded*/ ctx[1]);
    			}

    			if (dirty & /*hoverable*/ 8) {
    				toggle_class(table, "hoverable", /*hoverable*/ ctx[3]);
    			}

    			if (dirty & /*responsive*/ 8192) {
    				toggle_class(div, "responsive", /*responsive*/ ctx[13]);
    			}

    			if (dirty & /*nowrap*/ 16384) {
    				toggle_class(div, "nowrap", /*nowrap*/ ctx[14]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { bordered = false } = $$props;
    	let { rounded = false } = $$props;
    	let { borderless = false } = $$props;
    	let { hoverable = false } = $$props;
    	let { striped = false } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { responsive = false } = $$props;
    	let { nowrap = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("bordered" in $$props) $$invalidate(0, bordered = $$props.bordered);
    		if ("rounded" in $$props) $$invalidate(1, rounded = $$props.rounded);
    		if ("borderless" in $$props) $$invalidate(2, borderless = $$props.borderless);
    		if ("hoverable" in $$props) $$invalidate(3, hoverable = $$props.hoverable);
    		if ("striped" in $$props) $$invalidate(4, striped = $$props.striped);
    		if ("primary" in $$props) $$invalidate(5, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(6, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(7, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(8, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(9, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(10, info = $$props.info);
    		if ("light" in $$props) $$invalidate(11, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(12, dark = $$props.dark);
    		if ("responsive" in $$props) $$invalidate(13, responsive = $$props.responsive);
    		if ("nowrap" in $$props) $$invalidate(14, nowrap = $$props.nowrap);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	return [
    		bordered,
    		rounded,
    		borderless,
    		hoverable,
    		striped,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		responsive,
    		nowrap,
    		$$scope,
    		slots
    	];
    }

    class Table extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1hwmmdi-style")) add_css$4();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			bordered: 0,
    			rounded: 1,
    			borderless: 2,
    			hoverable: 3,
    			striped: 4,
    			primary: 5,
    			secondary: 6,
    			success: 7,
    			danger: 8,
    			warning: 9,
    			info: 10,
    			light: 11,
    			dark: 12,
    			responsive: 13,
    			nowrap: 14
    		});
    	}
    }

    /* src/Container.svelte generated by Svelte v3.29.4 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-10v2dp3-style";
    	style.textContent = ".container.svelte-10v2dp3{width:100%;padding-right:15px;padding-left:15px;margin-right:auto;margin-left:auto}@media(min-width: 576px){.container.svelte-10v2dp3{max-width:540px}}@media(min-width: 768px){.container.svelte-10v2dp3{max-width:720px}}@media(min-width: 992px){.container.svelte-10v2dp3{max-width:960px}}@media(min-width: 1200px){.container.svelte-10v2dp3{max-width:1140px}}.container-fluid.svelte-10v2dp3{width:100%;padding-right:15px;padding-left:15px;margin-right:auto;margin-left:auto}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "" + (null_to_empty(/*full*/ ctx[0] ? "container-fluid" : "container") + " svelte-10v2dp3"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*full*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(/*full*/ ctx[0] ? "container-fluid" : "container") + " svelte-10v2dp3"))) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { full = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ("full" in $$props) $$invalidate(0, full = $$props.full);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [full, $$scope, slots];
    }

    class Container extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-10v2dp3-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { full: 0 });
    	}
    }

    /* src/Row.svelte generated by Svelte v3.29.4 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-12nt07y-style";
    	style.textContent = ".row.svelte-12nt07y{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap;margin-right:-15px;margin-left:-15px}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "row svelte-12nt07y");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Row extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-12nt07y-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* src/Column.svelte generated by Svelte v3.29.4 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-y8tfo6-style";
    	style.textContent = ".clearfix.svelte-y8tfo6::after{display:block;clear:both;content:''}.visible.svelte-y8tfo6{visibility:visible !important}.invisible.svelte-y8tfo6{visibility:hidden !important}.hidden-xs-up.svelte-y8tfo6{display:none !important}@media(max-width: 575.98px){.hidden-xs-down.svelte-y8tfo6{display:none !important}}@media(min-width: 576px){.hidden-sm-up.svelte-y8tfo6{display:none !important}}@media(max-width: 767.98px){.hidden-sm-down.svelte-y8tfo6{display:none !important}}@media(min-width: 768px){.hidden-md-up.svelte-y8tfo6{display:none !important}}@media(max-width: 991.98px){.hidden-md-down.svelte-y8tfo6{display:none !important}}@media(min-width: 992px){.hidden-lg-up.svelte-y8tfo6{display:none !important}}@media(max-width: 1199.98px){.hidden-lg-down.svelte-y8tfo6{display:none !important}}@media(min-width: 1200px){.hidden-xl-up.svelte-y8tfo6{display:none !important}}.hidden-xl-down.svelte-y8tfo6{display:none !important}.visible-print-block.svelte-y8tfo6{display:none !important}@media print{.visible-print-block.svelte-y8tfo6{display:block !important}}.visible-print-inline.svelte-y8tfo6{display:none !important}@media print{.visible-print-inline.svelte-y8tfo6{display:inline !important}}.visible-print-inline-block.svelte-y8tfo6{display:none !important}@media print{.visible-print-inline-block.svelte-y8tfo6{display:inline-block !important}}@media print{.hidden-print.svelte-y8tfo6{display:none !important}}.no-gutters.svelte-y8tfo6{margin-right:0;margin-left:0}.col-1.svelte-y8tfo6,.col-2.svelte-y8tfo6,.col-3.svelte-y8tfo6,.col-4.svelte-y8tfo6,.col-5.svelte-y8tfo6,.col-6.svelte-y8tfo6,.col-7.svelte-y8tfo6,.col-8.svelte-y8tfo6,.col-9.svelte-y8tfo6,.col-10.svelte-y8tfo6,.col-11.svelte-y8tfo6,.col-12.svelte-y8tfo6,.col.svelte-y8tfo6,.col-auto.svelte-y8tfo6,.col-sm-1.svelte-y8tfo6,.col-sm-2.svelte-y8tfo6,.col-sm-3.svelte-y8tfo6,.col-sm-4.svelte-y8tfo6,.col-sm-5.svelte-y8tfo6,.col-sm-6.svelte-y8tfo6,.col-sm-7.svelte-y8tfo6,.col-sm-8.svelte-y8tfo6,.col-sm-9.svelte-y8tfo6,.col-sm-10.svelte-y8tfo6,.col-sm-11.svelte-y8tfo6,.col-sm-12.svelte-y8tfo6,.col-sm.svelte-y8tfo6,.col-sm-auto.svelte-y8tfo6,.col-md-1.svelte-y8tfo6,.col-md-2.svelte-y8tfo6,.col-md-3.svelte-y8tfo6,.col-md-4.svelte-y8tfo6,.col-md-5.svelte-y8tfo6,.col-md-6.svelte-y8tfo6,.col-md-7.svelte-y8tfo6,.col-md-8.svelte-y8tfo6,.col-md-9.svelte-y8tfo6,.col-md-10.svelte-y8tfo6,.col-md-11.svelte-y8tfo6,.col-md-12.svelte-y8tfo6,.col-md.svelte-y8tfo6,.col-md-auto.svelte-y8tfo6,.col-lg-1.svelte-y8tfo6,.col-lg-2.svelte-y8tfo6,.col-lg-3.svelte-y8tfo6,.col-lg-4.svelte-y8tfo6,.col-lg-5.svelte-y8tfo6,.col-lg-6.svelte-y8tfo6,.col-lg-7.svelte-y8tfo6,.col-lg-8.svelte-y8tfo6,.col-lg-9.svelte-y8tfo6,.col-lg-10.svelte-y8tfo6,.col-lg-11.svelte-y8tfo6,.col-lg-12.svelte-y8tfo6,.col-lg.svelte-y8tfo6,.col-lg-auto.svelte-y8tfo6,.col-xl-1.svelte-y8tfo6,.col-xl-2.svelte-y8tfo6,.col-xl-3.svelte-y8tfo6,.col-xl-4.svelte-y8tfo6,.col-xl-5.svelte-y8tfo6,.col-xl-6.svelte-y8tfo6,.col-xl-7.svelte-y8tfo6,.col-xl-8.svelte-y8tfo6,.col-xl-9.svelte-y8tfo6,.col-xl-10.svelte-y8tfo6,.col-xl-11.svelte-y8tfo6,.col-xl-12.svelte-y8tfo6,.col-xl.svelte-y8tfo6,.col-xl-auto.svelte-y8tfo6{position:relative;width:100%;padding-right:15px;padding-left:15px}.col.svelte-y8tfo6{-webkit-flex-basis:0;-ms-flex-preferred-size:0;flex-basis:0;-webkit-box-flex:1;-webkit-flex-grow:1;-ms-flex-positive:1;flex-grow:1;max-width:100%}.col-auto.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;width:auto;max-width:100%}.col-1.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 8.3333333333%;-ms-flex:0 0 8.3333333333%;flex:0 0 8.3333333333%;max-width:8.3333333333%}.col-2.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 16.6666666667%;-ms-flex:0 0 16.6666666667%;flex:0 0 16.6666666667%;max-width:16.6666666667%}.col-3.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 25%;-ms-flex:0 0 25%;flex:0 0 25%;max-width:25%}.col-4.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 33.3333333333%;-ms-flex:0 0 33.3333333333%;flex:0 0 33.3333333333%;max-width:33.3333333333%}.col-5.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 41.6666666667%;-ms-flex:0 0 41.6666666667%;flex:0 0 41.6666666667%;max-width:41.6666666667%}.col-6.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 50%;-ms-flex:0 0 50%;flex:0 0 50%;max-width:50%}.col-7.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 58.3333333333%;-ms-flex:0 0 58.3333333333%;flex:0 0 58.3333333333%;max-width:58.3333333333%}.col-8.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 66.6666666667%;-ms-flex:0 0 66.6666666667%;flex:0 0 66.6666666667%;max-width:66.6666666667%}.col-9.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 75%;-ms-flex:0 0 75%;flex:0 0 75%;max-width:75%}.col-10.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 83.3333333333%;-ms-flex:0 0 83.3333333333%;flex:0 0 83.3333333333%;max-width:83.3333333333%}.col-11.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 91.6666666667%;-ms-flex:0 0 91.6666666667%;flex:0 0 91.6666666667%;max-width:91.6666666667%}.col-12.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 100%;-ms-flex:0 0 100%;flex:0 0 100%;max-width:100%}.order-first.svelte-y8tfo6{-webkit-box-ordinal-group:0;-webkit-order:-1;-ms-flex-order:-1;order:-1}.order-last.svelte-y8tfo6{-webkit-box-ordinal-group:14;-webkit-order:13;-ms-flex-order:13;order:13}.order-0.svelte-y8tfo6{-webkit-box-ordinal-group:1;-webkit-order:0;-ms-flex-order:0;order:0}.order-1.svelte-y8tfo6{-webkit-box-ordinal-group:2;-webkit-order:1;-ms-flex-order:1;order:1}.order-2.svelte-y8tfo6{-webkit-box-ordinal-group:3;-webkit-order:2;-ms-flex-order:2;order:2}.order-3.svelte-y8tfo6{-webkit-box-ordinal-group:4;-webkit-order:3;-ms-flex-order:3;order:3}.order-4.svelte-y8tfo6{-webkit-box-ordinal-group:5;-webkit-order:4;-ms-flex-order:4;order:4}.order-5.svelte-y8tfo6{-webkit-box-ordinal-group:6;-webkit-order:5;-ms-flex-order:5;order:5}.order-6.svelte-y8tfo6{-webkit-box-ordinal-group:7;-webkit-order:6;-ms-flex-order:6;order:6}.order-7.svelte-y8tfo6{-webkit-box-ordinal-group:8;-webkit-order:7;-ms-flex-order:7;order:7}.order-8.svelte-y8tfo6{-webkit-box-ordinal-group:9;-webkit-order:8;-ms-flex-order:8;order:8}.order-9.svelte-y8tfo6{-webkit-box-ordinal-group:10;-webkit-order:9;-ms-flex-order:9;order:9}.order-10.svelte-y8tfo6{-webkit-box-ordinal-group:11;-webkit-order:10;-ms-flex-order:10;order:10}.order-11.svelte-y8tfo6{-webkit-box-ordinal-group:12;-webkit-order:11;-ms-flex-order:11;order:11}.order-12.svelte-y8tfo6{-webkit-box-ordinal-group:13;-webkit-order:12;-ms-flex-order:12;order:12}.offset-1.svelte-y8tfo6{margin-left:8.3333333333%}.offset-2.svelte-y8tfo6{margin-left:16.6666666667%}.offset-3.svelte-y8tfo6{margin-left:25%}.offset-4.svelte-y8tfo6{margin-left:33.3333333333%}.offset-5.svelte-y8tfo6{margin-left:41.6666666667%}.offset-6.svelte-y8tfo6{margin-left:50%}.offset-7.svelte-y8tfo6{margin-left:58.3333333333%}.offset-8.svelte-y8tfo6{margin-left:66.6666666667%}.offset-9.svelte-y8tfo6{margin-left:75%}.offset-10.svelte-y8tfo6{margin-left:83.3333333333%}.offset-11.svelte-y8tfo6{margin-left:91.6666666667%}@media(min-width: 576px){.col-sm.svelte-y8tfo6{-webkit-flex-basis:0;-ms-flex-preferred-size:0;flex-basis:0;-webkit-box-flex:1;-webkit-flex-grow:1;-ms-flex-positive:1;flex-grow:1;max-width:100%}.col-sm-auto.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;width:auto;max-width:100%}.col-sm-1.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 8.3333333333%;-ms-flex:0 0 8.3333333333%;flex:0 0 8.3333333333%;max-width:8.3333333333%}.col-sm-2.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 16.6666666667%;-ms-flex:0 0 16.6666666667%;flex:0 0 16.6666666667%;max-width:16.6666666667%}.col-sm-3.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 25%;-ms-flex:0 0 25%;flex:0 0 25%;max-width:25%}.col-sm-4.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 33.3333333333%;-ms-flex:0 0 33.3333333333%;flex:0 0 33.3333333333%;max-width:33.3333333333%}.col-sm-5.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 41.6666666667%;-ms-flex:0 0 41.6666666667%;flex:0 0 41.6666666667%;max-width:41.6666666667%}.col-sm-6.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 50%;-ms-flex:0 0 50%;flex:0 0 50%;max-width:50%}.col-sm-7.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 58.3333333333%;-ms-flex:0 0 58.3333333333%;flex:0 0 58.3333333333%;max-width:58.3333333333%}.col-sm-8.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 66.6666666667%;-ms-flex:0 0 66.6666666667%;flex:0 0 66.6666666667%;max-width:66.6666666667%}.col-sm-9.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 75%;-ms-flex:0 0 75%;flex:0 0 75%;max-width:75%}.col-sm-10.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 83.3333333333%;-ms-flex:0 0 83.3333333333%;flex:0 0 83.3333333333%;max-width:83.3333333333%}.col-sm-11.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 91.6666666667%;-ms-flex:0 0 91.6666666667%;flex:0 0 91.6666666667%;max-width:91.6666666667%}.col-sm-12.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 100%;-ms-flex:0 0 100%;flex:0 0 100%;max-width:100%}.order-sm-first.svelte-y8tfo6{-webkit-box-ordinal-group:0;-webkit-order:-1;-ms-flex-order:-1;order:-1}.order-sm-last.svelte-y8tfo6{-webkit-box-ordinal-group:14;-webkit-order:13;-ms-flex-order:13;order:13}.order-sm-0.svelte-y8tfo6{-webkit-box-ordinal-group:1;-webkit-order:0;-ms-flex-order:0;order:0}.order-sm-1.svelte-y8tfo6{-webkit-box-ordinal-group:2;-webkit-order:1;-ms-flex-order:1;order:1}.order-sm-2.svelte-y8tfo6{-webkit-box-ordinal-group:3;-webkit-order:2;-ms-flex-order:2;order:2}.order-sm-3.svelte-y8tfo6{-webkit-box-ordinal-group:4;-webkit-order:3;-ms-flex-order:3;order:3}.order-sm-4.svelte-y8tfo6{-webkit-box-ordinal-group:5;-webkit-order:4;-ms-flex-order:4;order:4}.order-sm-5.svelte-y8tfo6{-webkit-box-ordinal-group:6;-webkit-order:5;-ms-flex-order:5;order:5}.order-sm-6.svelte-y8tfo6{-webkit-box-ordinal-group:7;-webkit-order:6;-ms-flex-order:6;order:6}.order-sm-7.svelte-y8tfo6{-webkit-box-ordinal-group:8;-webkit-order:7;-ms-flex-order:7;order:7}.order-sm-8.svelte-y8tfo6{-webkit-box-ordinal-group:9;-webkit-order:8;-ms-flex-order:8;order:8}.order-sm-9.svelte-y8tfo6{-webkit-box-ordinal-group:10;-webkit-order:9;-ms-flex-order:9;order:9}.order-sm-10.svelte-y8tfo6{-webkit-box-ordinal-group:11;-webkit-order:10;-ms-flex-order:10;order:10}.order-sm-11.svelte-y8tfo6{-webkit-box-ordinal-group:12;-webkit-order:11;-ms-flex-order:11;order:11}.order-sm-12.svelte-y8tfo6{-webkit-box-ordinal-group:13;-webkit-order:12;-ms-flex-order:12;order:12}.offset-sm-0.svelte-y8tfo6{margin-left:0}.offset-sm-1.svelte-y8tfo6{margin-left:8.3333333333%}.offset-sm-2.svelte-y8tfo6{margin-left:16.6666666667%}.offset-sm-3.svelte-y8tfo6{margin-left:25%}.offset-sm-4.svelte-y8tfo6{margin-left:33.3333333333%}.offset-sm-5.svelte-y8tfo6{margin-left:41.6666666667%}.offset-sm-6.svelte-y8tfo6{margin-left:50%}.offset-sm-7.svelte-y8tfo6{margin-left:58.3333333333%}.offset-sm-8.svelte-y8tfo6{margin-left:66.6666666667%}.offset-sm-9.svelte-y8tfo6{margin-left:75%}.offset-sm-10.svelte-y8tfo6{margin-left:83.3333333333%}.offset-sm-11.svelte-y8tfo6{margin-left:91.6666666667%}}@media(min-width: 768px){.col-md.svelte-y8tfo6{-webkit-flex-basis:0;-ms-flex-preferred-size:0;flex-basis:0;-webkit-box-flex:1;-webkit-flex-grow:1;-ms-flex-positive:1;flex-grow:1;max-width:100%}.col-md-auto.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;width:auto;max-width:100%}.col-md-1.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 8.3333333333%;-ms-flex:0 0 8.3333333333%;flex:0 0 8.3333333333%;max-width:8.3333333333%}.col-md-2.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 16.6666666667%;-ms-flex:0 0 16.6666666667%;flex:0 0 16.6666666667%;max-width:16.6666666667%}.col-md-3.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 25%;-ms-flex:0 0 25%;flex:0 0 25%;max-width:25%}.col-md-4.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 33.3333333333%;-ms-flex:0 0 33.3333333333%;flex:0 0 33.3333333333%;max-width:33.3333333333%}.col-md-5.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 41.6666666667%;-ms-flex:0 0 41.6666666667%;flex:0 0 41.6666666667%;max-width:41.6666666667%}.col-md-6.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 50%;-ms-flex:0 0 50%;flex:0 0 50%;max-width:50%}.col-md-7.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 58.3333333333%;-ms-flex:0 0 58.3333333333%;flex:0 0 58.3333333333%;max-width:58.3333333333%}.col-md-8.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 66.6666666667%;-ms-flex:0 0 66.6666666667%;flex:0 0 66.6666666667%;max-width:66.6666666667%}.col-md-9.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 75%;-ms-flex:0 0 75%;flex:0 0 75%;max-width:75%}.col-md-10.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 83.3333333333%;-ms-flex:0 0 83.3333333333%;flex:0 0 83.3333333333%;max-width:83.3333333333%}.col-md-11.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 91.6666666667%;-ms-flex:0 0 91.6666666667%;flex:0 0 91.6666666667%;max-width:91.6666666667%}.col-md-12.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 100%;-ms-flex:0 0 100%;flex:0 0 100%;max-width:100%}.order-md-first.svelte-y8tfo6{-webkit-box-ordinal-group:0;-webkit-order:-1;-ms-flex-order:-1;order:-1}.order-md-last.svelte-y8tfo6{-webkit-box-ordinal-group:14;-webkit-order:13;-ms-flex-order:13;order:13}.order-md-0.svelte-y8tfo6{-webkit-box-ordinal-group:1;-webkit-order:0;-ms-flex-order:0;order:0}.order-md-1.svelte-y8tfo6{-webkit-box-ordinal-group:2;-webkit-order:1;-ms-flex-order:1;order:1}.order-md-2.svelte-y8tfo6{-webkit-box-ordinal-group:3;-webkit-order:2;-ms-flex-order:2;order:2}.order-md-3.svelte-y8tfo6{-webkit-box-ordinal-group:4;-webkit-order:3;-ms-flex-order:3;order:3}.order-md-4.svelte-y8tfo6{-webkit-box-ordinal-group:5;-webkit-order:4;-ms-flex-order:4;order:4}.order-md-5.svelte-y8tfo6{-webkit-box-ordinal-group:6;-webkit-order:5;-ms-flex-order:5;order:5}.order-md-6.svelte-y8tfo6{-webkit-box-ordinal-group:7;-webkit-order:6;-ms-flex-order:6;order:6}.order-md-7.svelte-y8tfo6{-webkit-box-ordinal-group:8;-webkit-order:7;-ms-flex-order:7;order:7}.order-md-8.svelte-y8tfo6{-webkit-box-ordinal-group:9;-webkit-order:8;-ms-flex-order:8;order:8}.order-md-9.svelte-y8tfo6{-webkit-box-ordinal-group:10;-webkit-order:9;-ms-flex-order:9;order:9}.order-md-10.svelte-y8tfo6{-webkit-box-ordinal-group:11;-webkit-order:10;-ms-flex-order:10;order:10}.order-md-11.svelte-y8tfo6{-webkit-box-ordinal-group:12;-webkit-order:11;-ms-flex-order:11;order:11}.order-md-12.svelte-y8tfo6{-webkit-box-ordinal-group:13;-webkit-order:12;-ms-flex-order:12;order:12}.offset-md-0.svelte-y8tfo6{margin-left:0}.offset-md-1.svelte-y8tfo6{margin-left:8.3333333333%}.offset-md-2.svelte-y8tfo6{margin-left:16.6666666667%}.offset-md-3.svelte-y8tfo6{margin-left:25%}.offset-md-4.svelte-y8tfo6{margin-left:33.3333333333%}.offset-md-5.svelte-y8tfo6{margin-left:41.6666666667%}.offset-md-6.svelte-y8tfo6{margin-left:50%}.offset-md-7.svelte-y8tfo6{margin-left:58.3333333333%}.offset-md-8.svelte-y8tfo6{margin-left:66.6666666667%}.offset-md-9.svelte-y8tfo6{margin-left:75%}.offset-md-10.svelte-y8tfo6{margin-left:83.3333333333%}.offset-md-11.svelte-y8tfo6{margin-left:91.6666666667%}}@media(min-width: 992px){.col-lg.svelte-y8tfo6{-webkit-flex-basis:0;-ms-flex-preferred-size:0;flex-basis:0;-webkit-box-flex:1;-webkit-flex-grow:1;-ms-flex-positive:1;flex-grow:1;max-width:100%}.col-lg-auto.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;width:auto;max-width:100%}.col-lg-1.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 8.3333333333%;-ms-flex:0 0 8.3333333333%;flex:0 0 8.3333333333%;max-width:8.3333333333%}.col-lg-2.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 16.6666666667%;-ms-flex:0 0 16.6666666667%;flex:0 0 16.6666666667%;max-width:16.6666666667%}.col-lg-3.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 25%;-ms-flex:0 0 25%;flex:0 0 25%;max-width:25%}.col-lg-4.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 33.3333333333%;-ms-flex:0 0 33.3333333333%;flex:0 0 33.3333333333%;max-width:33.3333333333%}.col-lg-5.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 41.6666666667%;-ms-flex:0 0 41.6666666667%;flex:0 0 41.6666666667%;max-width:41.6666666667%}.col-lg-6.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 50%;-ms-flex:0 0 50%;flex:0 0 50%;max-width:50%}.col-lg-7.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 58.3333333333%;-ms-flex:0 0 58.3333333333%;flex:0 0 58.3333333333%;max-width:58.3333333333%}.col-lg-8.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 66.6666666667%;-ms-flex:0 0 66.6666666667%;flex:0 0 66.6666666667%;max-width:66.6666666667%}.col-lg-9.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 75%;-ms-flex:0 0 75%;flex:0 0 75%;max-width:75%}.col-lg-10.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 83.3333333333%;-ms-flex:0 0 83.3333333333%;flex:0 0 83.3333333333%;max-width:83.3333333333%}.col-lg-11.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 91.6666666667%;-ms-flex:0 0 91.6666666667%;flex:0 0 91.6666666667%;max-width:91.6666666667%}.col-lg-12.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 100%;-ms-flex:0 0 100%;flex:0 0 100%;max-width:100%}.order-lg-first.svelte-y8tfo6{-webkit-box-ordinal-group:0;-webkit-order:-1;-ms-flex-order:-1;order:-1}.order-lg-last.svelte-y8tfo6{-webkit-box-ordinal-group:14;-webkit-order:13;-ms-flex-order:13;order:13}.order-lg-0.svelte-y8tfo6{-webkit-box-ordinal-group:1;-webkit-order:0;-ms-flex-order:0;order:0}.order-lg-1.svelte-y8tfo6{-webkit-box-ordinal-group:2;-webkit-order:1;-ms-flex-order:1;order:1}.order-lg-2.svelte-y8tfo6{-webkit-box-ordinal-group:3;-webkit-order:2;-ms-flex-order:2;order:2}.order-lg-3.svelte-y8tfo6{-webkit-box-ordinal-group:4;-webkit-order:3;-ms-flex-order:3;order:3}.order-lg-4.svelte-y8tfo6{-webkit-box-ordinal-group:5;-webkit-order:4;-ms-flex-order:4;order:4}.order-lg-5.svelte-y8tfo6{-webkit-box-ordinal-group:6;-webkit-order:5;-ms-flex-order:5;order:5}.order-lg-6.svelte-y8tfo6{-webkit-box-ordinal-group:7;-webkit-order:6;-ms-flex-order:6;order:6}.order-lg-7.svelte-y8tfo6{-webkit-box-ordinal-group:8;-webkit-order:7;-ms-flex-order:7;order:7}.order-lg-8.svelte-y8tfo6{-webkit-box-ordinal-group:9;-webkit-order:8;-ms-flex-order:8;order:8}.order-lg-9.svelte-y8tfo6{-webkit-box-ordinal-group:10;-webkit-order:9;-ms-flex-order:9;order:9}.order-lg-10.svelte-y8tfo6{-webkit-box-ordinal-group:11;-webkit-order:10;-ms-flex-order:10;order:10}.order-lg-11.svelte-y8tfo6{-webkit-box-ordinal-group:12;-webkit-order:11;-ms-flex-order:11;order:11}.order-lg-12.svelte-y8tfo6{-webkit-box-ordinal-group:13;-webkit-order:12;-ms-flex-order:12;order:12}.offset-lg-0.svelte-y8tfo6{margin-left:0}.offset-lg-1.svelte-y8tfo6{margin-left:8.3333333333%}.offset-lg-2.svelte-y8tfo6{margin-left:16.6666666667%}.offset-lg-3.svelte-y8tfo6{margin-left:25%}.offset-lg-4.svelte-y8tfo6{margin-left:33.3333333333%}.offset-lg-5.svelte-y8tfo6{margin-left:41.6666666667%}.offset-lg-6.svelte-y8tfo6{margin-left:50%}.offset-lg-7.svelte-y8tfo6{margin-left:58.3333333333%}.offset-lg-8.svelte-y8tfo6{margin-left:66.6666666667%}.offset-lg-9.svelte-y8tfo6{margin-left:75%}.offset-lg-10.svelte-y8tfo6{margin-left:83.3333333333%}.offset-lg-11.svelte-y8tfo6{margin-left:91.6666666667%}}@media(min-width: 1200px){.col-xl.svelte-y8tfo6{-webkit-flex-basis:0;-ms-flex-preferred-size:0;flex-basis:0;-webkit-box-flex:1;-webkit-flex-grow:1;-ms-flex-positive:1;flex-grow:1;max-width:100%}.col-xl-auto.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 auto;-ms-flex:0 0 auto;flex:0 0 auto;width:auto;max-width:100%}.col-xl-1.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 8.3333333333%;-ms-flex:0 0 8.3333333333%;flex:0 0 8.3333333333%;max-width:8.3333333333%}.col-xl-2.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 16.6666666667%;-ms-flex:0 0 16.6666666667%;flex:0 0 16.6666666667%;max-width:16.6666666667%}.col-xl-3.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 25%;-ms-flex:0 0 25%;flex:0 0 25%;max-width:25%}.col-xl-4.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 33.3333333333%;-ms-flex:0 0 33.3333333333%;flex:0 0 33.3333333333%;max-width:33.3333333333%}.col-xl-5.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 41.6666666667%;-ms-flex:0 0 41.6666666667%;flex:0 0 41.6666666667%;max-width:41.6666666667%}.col-xl-6.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 50%;-ms-flex:0 0 50%;flex:0 0 50%;max-width:50%}.col-xl-7.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 58.3333333333%;-ms-flex:0 0 58.3333333333%;flex:0 0 58.3333333333%;max-width:58.3333333333%}.col-xl-8.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 66.6666666667%;-ms-flex:0 0 66.6666666667%;flex:0 0 66.6666666667%;max-width:66.6666666667%}.col-xl-9.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 75%;-ms-flex:0 0 75%;flex:0 0 75%;max-width:75%}.col-xl-10.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 83.3333333333%;-ms-flex:0 0 83.3333333333%;flex:0 0 83.3333333333%;max-width:83.3333333333%}.col-xl-11.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 91.6666666667%;-ms-flex:0 0 91.6666666667%;flex:0 0 91.6666666667%;max-width:91.6666666667%}.col-xl-12.svelte-y8tfo6{-webkit-box-flex:0;-webkit-flex:0 0 100%;-ms-flex:0 0 100%;flex:0 0 100%;max-width:100%}.order-xl-first.svelte-y8tfo6{-webkit-box-ordinal-group:0;-webkit-order:-1;-ms-flex-order:-1;order:-1}.order-xl-last.svelte-y8tfo6{-webkit-box-ordinal-group:14;-webkit-order:13;-ms-flex-order:13;order:13}.order-xl-0.svelte-y8tfo6{-webkit-box-ordinal-group:1;-webkit-order:0;-ms-flex-order:0;order:0}.order-xl-1.svelte-y8tfo6{-webkit-box-ordinal-group:2;-webkit-order:1;-ms-flex-order:1;order:1}.order-xl-2.svelte-y8tfo6{-webkit-box-ordinal-group:3;-webkit-order:2;-ms-flex-order:2;order:2}.order-xl-3.svelte-y8tfo6{-webkit-box-ordinal-group:4;-webkit-order:3;-ms-flex-order:3;order:3}.order-xl-4.svelte-y8tfo6{-webkit-box-ordinal-group:5;-webkit-order:4;-ms-flex-order:4;order:4}.order-xl-5.svelte-y8tfo6{-webkit-box-ordinal-group:6;-webkit-order:5;-ms-flex-order:5;order:5}.order-xl-6.svelte-y8tfo6{-webkit-box-ordinal-group:7;-webkit-order:6;-ms-flex-order:6;order:6}.order-xl-7.svelte-y8tfo6{-webkit-box-ordinal-group:8;-webkit-order:7;-ms-flex-order:7;order:7}.order-xl-8.svelte-y8tfo6{-webkit-box-ordinal-group:9;-webkit-order:8;-ms-flex-order:8;order:8}.order-xl-9.svelte-y8tfo6{-webkit-box-ordinal-group:10;-webkit-order:9;-ms-flex-order:9;order:9}.order-xl-10.svelte-y8tfo6{-webkit-box-ordinal-group:11;-webkit-order:10;-ms-flex-order:10;order:10}.order-xl-11.svelte-y8tfo6{-webkit-box-ordinal-group:12;-webkit-order:11;-ms-flex-order:11;order:11}.order-xl-12.svelte-y8tfo6{-webkit-box-ordinal-group:13;-webkit-order:12;-ms-flex-order:12;order:12}.offset-xl-0.svelte-y8tfo6{margin-left:0}.offset-xl-1.svelte-y8tfo6{margin-left:8.3333333333%}.offset-xl-2.svelte-y8tfo6{margin-left:16.6666666667%}.offset-xl-3.svelte-y8tfo6{margin-left:25%}.offset-xl-4.svelte-y8tfo6{margin-left:33.3333333333%}.offset-xl-5.svelte-y8tfo6{margin-left:41.6666666667%}.offset-xl-6.svelte-y8tfo6{margin-left:50%}.offset-xl-7.svelte-y8tfo6{margin-left:58.3333333333%}.offset-xl-8.svelte-y8tfo6{margin-left:66.6666666667%}.offset-xl-9.svelte-y8tfo6{margin-left:75%}.offset-xl-10.svelte-y8tfo6{margin-left:83.3333333333%}.offset-xl-11.svelte-y8tfo6{margin-left:91.6666666667%}}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let div;
    	let div_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", div_class_value = "" + (null_to_empty(/*$$props*/ ctx[0].class) + " svelte-y8tfo6"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*$$props*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(/*$$props*/ ctx[0].class) + " svelte-y8tfo6"))) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("$$scope" in $$new_props) $$invalidate(1, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);
    	return [$$props, $$scope, slots];
    }

    class Column extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-y8tfo6-style")) add_css$7();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/CollapsiblePanel.svelte generated by Svelte v3.29.4 */

    function create_fragment$8(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Panel";
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class CollapsiblePanel extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$8, safe_not_equal, {});
    	}
    }

    /* src/Input.svelte generated by Svelte v3.29.4 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-5a5uuf-style";
    	style.textContent = "input.svelte-5a5uuf{padding:8px 10px;width:100%;color:#0f001a;background-color:#ffffff;resize:vertical;margin:auto auto 10px auto;font-size:1rem}";
    	append(document.head, style);
    }

    // (41:30) 
    function create_if_block_7(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "checkbox");
    			input.__value = /*value*/ ctx[0];
    			input.value = input.__value;
    			attr(input, "class", "svelte-5a5uuf");
    			/*$$binding_groups*/ ctx[12][0].push(input);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			input.checked = ~/*group*/ ctx[1].indexOf(input.__value);

    			if (!mounted) {
    				dispose = listen(input, "change", /*input_change_handler_2*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1) {
    				input.__value = /*value*/ ctx[0];
    				input.value = input.__value;
    			}

    			if (dirty & /*group*/ 2) {
    				input.checked = ~/*group*/ ctx[1].indexOf(input.__value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (39:27) 
    function create_if_block_6(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "type", "radio");
    			input.__value = /*value*/ ctx[0];
    			input.value = input.__value;
    			attr(input, "id", /*id*/ ctx[7]);
    			attr(input, "class", "svelte-5a5uuf");
    			/*$$binding_groups*/ ctx[12][0].push(input);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			input.checked = input.__value === /*group*/ ctx[1];

    			if (!mounted) {
    				dispose = listen(input, "change", /*input_change_handler_1*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*value*/ 1) {
    				input.__value = /*value*/ ctx[0];
    				input.value = input.__value;
    			}

    			if (dirty & /*id*/ 128) {
    				attr(input, "id", /*id*/ ctx[7]);
    			}

    			if (dirty & /*group*/ 2) {
    				input.checked = input.__value === /*group*/ ctx[1];
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (34:26) 
    function create_if_block_4(ctx) {
    	let t;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block = /*label*/ ctx[2] && create_if_block_5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			input = element("input");
    			attr(input, "type", "file");
    			attr(input, "class", "svelte-5a5uuf");
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			insert(target, input, anchor);

    			if (!mounted) {
    				dispose = listen(input, "change", /*input_change_handler*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*label*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (29:26) 
    function create_if_block_2$1(ctx) {
    	let t;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block = /*label*/ ctx[2] && create_if_block_3$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			input = element("input");
    			attr(input, "type", "text");
    			attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr(input, "class", "svelte-5a5uuf");
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler_1*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*label*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (24:0) {#if type === 'number'}
    function create_if_block$3(ctx) {
    	let t;
    	let input;
    	let mounted;
    	let dispose;
    	let if_block = /*label*/ ctx[2] && create_if_block_1$2(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			input = element("input");
    			attr(input, "type", "number");
    			attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr(input, "min", /*min*/ ctx[5]);
    			attr(input, "max", /*max*/ ctx[6]);
    			attr(input, "class", "svelte-5a5uuf");
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = listen(input, "input", /*input_input_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*label*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*min*/ 32) {
    				attr(input, "min", /*min*/ ctx[5]);
    			}

    			if (dirty & /*max*/ 64) {
    				attr(input, "max", /*max*/ ctx[6]);
    			}

    			if (dirty & /*value*/ 1 && to_number(input.value) !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(input);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (35:2) {#if label}
    function create_if_block_5(ctx) {
    	let label_1;
    	let t;

    	return {
    		c() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 4) set_data(t, /*label*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    		}
    	};
    }

    // (30:2) {#if label}
    function create_if_block_3$1(ctx) {
    	let label_1;
    	let t;

    	return {
    		c() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 4) set_data(t, /*label*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    		}
    	};
    }

    // (25:2) {#if label}
    function create_if_block_1$2(ctx) {
    	let label_1;
    	let t;

    	return {
    		c() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 4) set_data(t, /*label*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[4] === "number") return create_if_block$3;
    		if (/*type*/ ctx[4] === "text") return create_if_block_2$1;
    		if (/*type*/ ctx[4] === "file") return create_if_block_4;
    		if (/*type*/ ctx[4] === "radio") return create_if_block_6;
    		if (/*type*/ ctx[4] === "checkbox") return create_if_block_7;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { label = undefined } = $$props;
    	let { placeholder = null } = $$props;
    	let { type = "text" } = $$props;
    	let { value = undefined } = $$props;
    	let { group = undefined } = $$props;
    	let { min = undefined } = $$props;
    	let { max = undefined } = $$props;
    	let { id = undefined } = $$props;
    	const $$binding_groups = [[]];

    	function input_input_handler() {
    		value = to_number(this.value);
    		$$invalidate(0, value);
    	}

    	function input_input_handler_1() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_change_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	function input_change_handler_1() {
    		group = this.__value;
    		$$invalidate(1, group);
    	}

    	function input_change_handler_2() {
    		group = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		$$invalidate(1, group);
    	}

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("placeholder" in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ("type" in $$props) $$invalidate(4, type = $$props.type);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("group" in $$props) $$invalidate(1, group = $$props.group);
    		if ("min" in $$props) $$invalidate(5, min = $$props.min);
    		if ("max" in $$props) $$invalidate(6, max = $$props.max);
    		if ("id" in $$props) $$invalidate(7, id = $$props.id);
    	};

    	return [
    		value,
    		group,
    		label,
    		placeholder,
    		type,
    		min,
    		max,
    		id,
    		input_input_handler,
    		input_input_handler_1,
    		input_change_handler,
    		input_change_handler_1,
    		$$binding_groups,
    		input_change_handler_2
    	];
    }

    class Input extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-5a5uuf-style")) add_css$8();

    		init(this, options, instance$8, create_fragment$9, safe_not_equal, {
    			label: 2,
    			placeholder: 3,
    			type: 4,
    			value: 0,
    			group: 1,
    			min: 5,
    			max: 6,
    			id: 7
    		});
    	}
    }

    /* src/Textarea.svelte generated by Svelte v3.29.4 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-vtne9q-style";
    	style.textContent = ".svelteit-textarea.svelte-vtne9q textarea.svelte-vtne9q{padding:10px;width:100%;margin:0 auto 1em;color:#0f001a;background-color:#ffffff;resize:vertical;font-size:1rem}";
    	append(document.head, style);
    }

    // (16:2) {#if label}
    function create_if_block$4(ctx) {
    	let label_1;
    	let t0;
    	let t1;
    	let br;

    	return {
    		c() {
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[0]);
    			t1 = space();
    			br = element("br");
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t0);
    			insert(target, t1, anchor);
    			insert(target, br, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1) set_data(t0, /*label*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    			if (detaching) detach(t1);
    			if (detaching) detach(br);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let div;
    	let t;
    	let textarea;
    	let textarea_name_value;
    	let if_block = /*label*/ ctx[0] && create_if_block$4(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			textarea = element("textarea");
    			attr(textarea, "name", textarea_name_value = "subject");
    			attr(textarea, "placeholder", /*placeholder*/ ctx[1]);
    			set_style(textarea, "height", "150px");
    			attr(textarea, "class", "svelte-vtne9q");
    			attr(div, "class", "svelteit-textarea svelte-vtne9q");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);
    			append(div, textarea);
    		},
    		p(ctx, [dirty]) {
    			if (/*label*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*placeholder*/ 2) {
    				attr(textarea, "placeholder", /*placeholder*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { label = undefined } = $$props;
    	let { placeholder = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("placeholder" in $$props) $$invalidate(1, placeholder = $$props.placeholder);
    	};

    	return [label, placeholder];
    }

    class Textarea extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-vtne9q-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { label: 0, placeholder: 1 });
    	}
    }

    /* src/Select.svelte generated by Svelte v3.29.4 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-bx9ga9-style";
    	style.textContent = "select.svelte-bx9ga9{padding:8px 10px;width:100%;margin:0 auto 1em;color:#0f001a;background-color:#ffffff;font-size:1rem;font-family:inherit;resize:vertical}";
    	append(document.head, style);
    }

    // (19:2) {#if label}
    function create_if_block$5(ctx) {
    	let label_1;
    	let t0;
    	let t1;
    	let br;

    	return {
    		c() {
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[0]);
    			t1 = space();
    			br = element("br");
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t0);
    			insert(target, t1, anchor);
    			insert(target, br, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1) set_data(t0, /*label*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    			if (detaching) detach(t1);
    			if (detaching) detach(br);
    		}
    	};
    }

    // (24:10)        
    function fallback_block$2(ctx) {
    	let em;

    	return {
    		c() {
    			em = element("em");
    			em.textContent = "Missing options";
    		},
    		m(target, anchor) {
    			insert(target, em, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(em);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let div;
    	let t;
    	let select;
    	let current;
    	let if_block = /*label*/ ctx[0] && create_if_block$5(ctx);
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
    	const default_slot_or_fallback = default_slot || fallback_block$2();

    	let select_levels = [
    		{ type: /*type*/ ctx[1] },
    		{ multiple: /*multiple*/ ctx[2] },
    		/*$$props*/ ctx[3]
    	];

    	let select_data = {};

    	for (let i = 0; i < select_levels.length; i += 1) {
    		select_data = assign(select_data, select_levels[i]);
    	}

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			select = element("select");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			set_attributes(select, select_data);
    			toggle_class(select, "svelte-bx9ga9", true);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);
    			append(div, select);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(select, null);
    			}

    			if (select_data.multiple) select_options(select, select_data.value);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*label*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
    				}
    			}

    			set_attributes(select, select_data = get_spread_update(select_levels, [
    				(!current || dirty & /*type*/ 2) && { type: /*type*/ ctx[1] },
    				(!current || dirty & /*multiple*/ 4) && { multiple: /*multiple*/ ctx[2] },
    				dirty & /*$$props*/ 8 && /*$$props*/ ctx[3]
    			]));

    			if (dirty & /*type, multiple, $$props*/ 14 && select_data.multiple) select_options(select, select_data.value);
    			toggle_class(select, "svelte-bx9ga9", true);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = undefined } = $$props;
    	let { type = "text" } = $$props;
    	let { multiple = false } = $$props;
    	let { primary = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("label" in $$new_props) $$invalidate(0, label = $$new_props.label);
    		if ("type" in $$new_props) $$invalidate(1, type = $$new_props.type);
    		if ("multiple" in $$new_props) $$invalidate(2, multiple = $$new_props.multiple);
    		if ("primary" in $$new_props) $$invalidate(4, primary = $$new_props.primary);
    		if ("$$scope" in $$new_props) $$invalidate(5, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);
    	return [label, type, multiple, $$props, primary, $$scope, slots];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-bx9ga9-style")) add_css$a();

    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {
    			label: 0,
    			type: 1,
    			multiple: 2,
    			primary: 4
    		});
    	}
    }

    /* src/List.svelte generated by Svelte v3.29.4 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-g46uw0-style";
    	style.textContent = "ul.svelteit-list{list-style-type:none;padding:0;margin:0;display:block;margin-block-start:0;margin-block-end:0;margin-inline-start:0;margin-inline-end:0;padding-inline-start:0}ul.svelteit-list>li{border:1px solid #f4e6ff;margin-top:-1px;background-color:#ffffff;padding:12px;color:#0f001a}ul.svelteit-list.primary li{background-color:#9100ff;color:white}ul.svelteit-list.secondary li{background-color:#826c93;color:white}ul.svelteit-list.success li{background-color:#47c639;color:white}ul.svelteit-list.danger li{background-color:#ff006e;color:white}ul.svelteit-list.warning li{background-color:#ffa600;color:white}ul.svelteit-list.info li{background-color:#00d8ff;color:white}ul.svelteit-list.light li{background-color:#f4e6ff;color:black;border:1px solid #ffffff}ul.svelteit-list.dark li{background-color:#0f001a;color:white}";
    	append(document.head, style);
    }

    function create_fragment$c(ctx) {
    	let ul;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);
    	let ul_levels = [/*$$props*/ ctx[10], { class: "svelteit-list" }];
    	let ul_data = {};

    	for (let i = 0; i < ul_levels.length; i += 1) {
    		ul_data = assign(ul_data, ul_levels[i]);
    	}

    	return {
    		c() {
    			ul = element("ul");
    			if (default_slot) default_slot.c();
    			set_attributes(ul, ul_data);
    			toggle_class(ul, "primary", /*primary*/ ctx[0]);
    			toggle_class(ul, "secondary", /*secondary*/ ctx[1]);
    			toggle_class(ul, "success", /*success*/ ctx[2]);
    			toggle_class(ul, "danger", /*danger*/ ctx[3]);
    			toggle_class(ul, "warning", /*warning*/ ctx[4]);
    			toggle_class(ul, "info", /*info*/ ctx[5]);
    			toggle_class(ul, "light", /*light*/ ctx[6]);
    			toggle_class(ul, "dark", /*dark*/ ctx[7]);
    			toggle_class(ul, "rounded", /*rounded*/ ctx[8]);
    			toggle_class(ul, "outlined", /*outlined*/ ctx[9]);
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			if (default_slot) {
    				default_slot.m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2048) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[11], dirty, null, null);
    				}
    			}

    			set_attributes(ul, ul_data = get_spread_update(ul_levels, [
    				dirty & /*$$props*/ 1024 && /*$$props*/ ctx[10],
    				{ class: "svelteit-list" }
    			]));

    			toggle_class(ul, "primary", /*primary*/ ctx[0]);
    			toggle_class(ul, "secondary", /*secondary*/ ctx[1]);
    			toggle_class(ul, "success", /*success*/ ctx[2]);
    			toggle_class(ul, "danger", /*danger*/ ctx[3]);
    			toggle_class(ul, "warning", /*warning*/ ctx[4]);
    			toggle_class(ul, "info", /*info*/ ctx[5]);
    			toggle_class(ul, "light", /*light*/ ctx[6]);
    			toggle_class(ul, "dark", /*dark*/ ctx[7]);
    			toggle_class(ul, "rounded", /*rounded*/ ctx[8]);
    			toggle_class(ul, "outlined", /*outlined*/ ctx[9]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { rounded = false } = $$props;
    	let { outlined = false } = $$props;

    	$$self.$$set = $$new_props => {
    		$$invalidate(10, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("primary" in $$new_props) $$invalidate(0, primary = $$new_props.primary);
    		if ("secondary" in $$new_props) $$invalidate(1, secondary = $$new_props.secondary);
    		if ("success" in $$new_props) $$invalidate(2, success = $$new_props.success);
    		if ("danger" in $$new_props) $$invalidate(3, danger = $$new_props.danger);
    		if ("warning" in $$new_props) $$invalidate(4, warning = $$new_props.warning);
    		if ("info" in $$new_props) $$invalidate(5, info = $$new_props.info);
    		if ("light" in $$new_props) $$invalidate(6, light = $$new_props.light);
    		if ("dark" in $$new_props) $$invalidate(7, dark = $$new_props.dark);
    		if ("rounded" in $$new_props) $$invalidate(8, rounded = $$new_props.rounded);
    		if ("outlined" in $$new_props) $$invalidate(9, outlined = $$new_props.outlined);
    		if ("$$scope" in $$new_props) $$invalidate(11, $$scope = $$new_props.$$scope);
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		rounded,
    		outlined,
    		$$props,
    		$$scope,
    		slots
    	];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-g46uw0-style")) add_css$b();

    		init(this, options, instance$b, create_fragment$c, safe_not_equal, {
    			primary: 0,
    			secondary: 1,
    			success: 2,
    			danger: 3,
    			warning: 4,
    			info: 5,
    			light: 6,
    			dark: 7,
    			rounded: 8,
    			outlined: 9
    		});
    	}
    }

    /* src/ProgressBar.svelte generated by Svelte v3.29.4 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-y906la-style";
    	style.textContent = ".progress-container.svelte-y906la{background:#ffffff}.svelteit-center.svelte-y906la{text-align:center}.svelteit-container.svelte-y906la:after,.svelteit-container.svelte-y906la:before{content:'';display:table;clear:both}.svelteit-container.svelte-y906la{padding:0.01em 16px}.primary.svelte-y906la{background-color:#9100ff;color:white;padding:5px}.primary.bordered.svelte-y906la{border:1px solid #7400cc}.secondary.svelte-y906la{background-color:#826c93;color:white;padding:5px}.secondary.bordered.svelte-y906la{border:1px solid #685775}.success.svelte-y906la{background-color:#47c639;color:white;padding:5px}.success.bordered.svelte-y906la{border:1px solid #399e2e}.danger.svelte-y906la{background-color:#ff006e;color:white;padding:5px}.danger.bordered.svelte-y906la{border:1px solid #cc0058}.warning.svelte-y906la{background-color:#ffa600;color:white;padding:5px}.warning.bordered.svelte-y906la{border:1px solid #cc8500}.info.svelte-y906la{background-color:#00d8ff;color:white;padding:5px}.info.bordered.svelte-y906la{border:1px solid #00adcc}.light.svelte-y906la{background-color:#f4e6ff;color:black;padding:5px}.light.bordered.svelte-y906la{border:1px solid #deb3ff}.dark.svelte-y906la{background-color:#0f001a;color:white;padding:5px}.dark.bordered.svelte-y906la{border:1px solid black}.small.svelte-y906la{padding:0px}.medium.svelte-y906la{padding:5px}.large.svelte-y906la{padding:10px}";
    	append(document.head, style);
    }

    // (114:4) {#if label}
    function create_if_block$6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*label*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 2) set_data(t, /*label*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let div1;
    	let div0;
    	let div0_style_value;
    	let if_block = /*label*/ ctx[1] && create_if_block$6(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			attr(div0, "class", "svelteit-container svelteit-center svelte-y906la");
    			attr(div0, "style", div0_style_value = `width:${/*progress*/ ctx[0]}%`);
    			toggle_class(div0, "primary", /*primary*/ ctx[2]);
    			toggle_class(div0, "secondary", /*secondary*/ ctx[3]);
    			toggle_class(div0, "success", /*success*/ ctx[4]);
    			toggle_class(div0, "danger", /*danger*/ ctx[5]);
    			toggle_class(div0, "warning", /*warning*/ ctx[6]);
    			toggle_class(div0, "info", /*info*/ ctx[7]);
    			toggle_class(div0, "light", /*light*/ ctx[8]);
    			toggle_class(div0, "dark", /*dark*/ ctx[9]);
    			toggle_class(div0, "small", /*small*/ ctx[10]);
    			toggle_class(div0, "medium", /*medium*/ ctx[11]);
    			toggle_class(div0, "large", /*large*/ ctx[12]);
    			toggle_class(div0, "bordered", /*bordered*/ ctx[13]);
    			attr(div1, "class", "progress-container svelte-y906la");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			if (if_block) if_block.m(div0, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*label*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$6(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*progress*/ 1 && div0_style_value !== (div0_style_value = `width:${/*progress*/ ctx[0]}%`)) {
    				attr(div0, "style", div0_style_value);
    			}

    			if (dirty & /*primary*/ 4) {
    				toggle_class(div0, "primary", /*primary*/ ctx[2]);
    			}

    			if (dirty & /*secondary*/ 8) {
    				toggle_class(div0, "secondary", /*secondary*/ ctx[3]);
    			}

    			if (dirty & /*success*/ 16) {
    				toggle_class(div0, "success", /*success*/ ctx[4]);
    			}

    			if (dirty & /*danger*/ 32) {
    				toggle_class(div0, "danger", /*danger*/ ctx[5]);
    			}

    			if (dirty & /*warning*/ 64) {
    				toggle_class(div0, "warning", /*warning*/ ctx[6]);
    			}

    			if (dirty & /*info*/ 128) {
    				toggle_class(div0, "info", /*info*/ ctx[7]);
    			}

    			if (dirty & /*light*/ 256) {
    				toggle_class(div0, "light", /*light*/ ctx[8]);
    			}

    			if (dirty & /*dark*/ 512) {
    				toggle_class(div0, "dark", /*dark*/ ctx[9]);
    			}

    			if (dirty & /*small*/ 1024) {
    				toggle_class(div0, "small", /*small*/ ctx[10]);
    			}

    			if (dirty & /*medium*/ 2048) {
    				toggle_class(div0, "medium", /*medium*/ ctx[11]);
    			}

    			if (dirty & /*large*/ 4096) {
    				toggle_class(div0, "large", /*large*/ ctx[12]);
    			}

    			if (dirty & /*bordered*/ 8192) {
    				toggle_class(div0, "bordered", /*bordered*/ ctx[13]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { progress = 0 } = $$props;
    	let { label = null } = $$props;
    	let { primary = true } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { bordered = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("progress" in $$props) $$invalidate(0, progress = $$props.progress);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("primary" in $$props) $$invalidate(2, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(3, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(4, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(5, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(6, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(7, info = $$props.info);
    		if ("light" in $$props) $$invalidate(8, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(9, dark = $$props.dark);
    		if ("small" in $$props) $$invalidate(10, small = $$props.small);
    		if ("medium" in $$props) $$invalidate(11, medium = $$props.medium);
    		if ("large" in $$props) $$invalidate(12, large = $$props.large);
    		if ("bordered" in $$props) $$invalidate(13, bordered = $$props.bordered);
    	};

    	return [
    		progress,
    		label,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		small,
    		medium,
    		large,
    		bordered
    	];
    }

    class ProgressBar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-y906la-style")) add_css$c();

    		init(this, options, instance$c, create_fragment$d, safe_not_equal, {
    			progress: 0,
    			label: 1,
    			primary: 2,
    			secondary: 3,
    			success: 4,
    			danger: 5,
    			warning: 6,
    			info: 7,
    			light: 8,
    			dark: 9,
    			small: 10,
    			medium: 11,
    			large: 12,
    			bordered: 13
    		});
    	}
    }

    /* src/Accordions.svelte generated by Svelte v3.29.4 */

    function fallback_block$3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Please add at least one Accordion");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let section;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);
    	const default_slot_or_fallback = default_slot || fallback_block$3();

    	return {
    		c() {
    			section = element("section");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			attr(section, "class", "accordions collapsible");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(section, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Accordions extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$e, safe_not_equal, {});
    	}
    }

    /* src/Accordion.svelte generated by Svelte v3.29.4 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-4k7w0y-style";
    	style.textContent = ".svelteit-accordion-header.svelte-4k7w0y{padding:20px;cursor:pointer;border-right:1px solid transparent;border-bottom:0px solid transparent;border-left:1px solid transparent;border-top:1px solid transparent}.svelteit-accordion-header.svelte-4k7w0y:last-child{padding:20px;cursor:pointer;border-bottom:1px solid transparent}.svelteit-accordion-header.primary.svelte-4k7w0y{background-color:#9100ff;color:white}.svelteit-accordion-header.primary.svelte-4k7w0y:hover{background-color:rgba(145, 0, 255, 0.8)}.svelteit-accordion-header.primary.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;transform:translateY(1px);outline:none;background-color:rgba(145, 0, 255, 0.8)}.svelteit-accordion-header.primary.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #9100ff, 0px 10px 20px -10px #9100ff;background-color:rgba(145, 0, 255, 0.8)}.svelteit-accordion-header.secondary.svelte-4k7w0y{background-color:#826c93;color:white}.svelteit-accordion-header.secondary.svelte-4k7w0y:hover{background-color:rgba(130, 108, 147, 0.8)}.svelteit-accordion-header.secondary.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;transform:translateY(1px);outline:none;background-color:rgba(130, 108, 147, 0.8)}.svelteit-accordion-header.secondary.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #826c93, 0px 10px 20px -10px #826c93;background-color:rgba(130, 108, 147, 0.8)}.svelteit-accordion-header.success.svelte-4k7w0y{background-color:#47c639;color:white}.svelteit-accordion-header.success.svelte-4k7w0y:hover{background-color:rgba(71, 198, 57, 0.8)}.svelteit-accordion-header.success.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;transform:translateY(1px);outline:none;background-color:rgba(71, 198, 57, 0.8)}.svelteit-accordion-header.success.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #47c639, 0px 10px 20px -10px #47c639;background-color:rgba(71, 198, 57, 0.8)}.svelteit-accordion-header.danger.svelte-4k7w0y{background-color:#ff006e;color:white}.svelteit-accordion-header.danger.svelte-4k7w0y:hover{background-color:rgba(255, 0, 110, 0.8)}.svelteit-accordion-header.danger.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;transform:translateY(1px);outline:none;background-color:rgba(255, 0, 110, 0.8)}.svelteit-accordion-header.danger.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #ff006e, 0px 10px 20px -10px #ff006e;background-color:rgba(255, 0, 110, 0.8)}.svelteit-accordion-header.warning.svelte-4k7w0y{background-color:#ffa600;color:white}.svelteit-accordion-header.warning.svelte-4k7w0y:hover{background-color:rgba(255, 166, 0, 0.8)}.svelteit-accordion-header.warning.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;transform:translateY(1px);outline:none;background-color:rgba(255, 166, 0, 0.8)}.svelteit-accordion-header.warning.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #ffa600, 0px 10px 20px -10px #ffa600;background-color:rgba(255, 166, 0, 0.8)}.svelteit-accordion-header.info.svelte-4k7w0y{background-color:#00d8ff;color:white}.svelteit-accordion-header.info.svelte-4k7w0y:hover{background-color:rgba(0, 216, 255, 0.8)}.svelteit-accordion-header.info.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;transform:translateY(1px);outline:none;background-color:rgba(0, 216, 255, 0.8)}.svelteit-accordion-header.info.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #00d8ff, 0px 10px 20px -10px #00d8ff;background-color:rgba(0, 216, 255, 0.8)}.svelteit-accordion-header.light.svelte-4k7w0y{background-color:#f4e6ff;color:black}.svelteit-accordion-header.light.svelte-4k7w0y:hover{background-color:rgba(244, 230, 255, 0.8)}.svelteit-accordion-header.light.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;transform:translateY(1px);outline:none;background-color:rgba(244, 230, 255, 0.8)}.svelteit-accordion-header.light.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #f4e6ff, 0px 10px 20px -10px #f4e6ff;background-color:rgba(244, 230, 255, 0.8)}.svelteit-accordion-header.dark.svelte-4k7w0y{background-color:#0f001a;color:white}.svelteit-accordion-header.dark.svelte-4k7w0y:hover{background-color:rgba(15, 0, 26, 0.8)}.svelteit-accordion-header.dark.svelte-4k7w0y:active{box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;transform:translateY(1px);outline:none;background-color:rgba(15, 0, 26, 0.8)}.svelteit-accordion-header.dark.svelte-4k7w0y:focus{outline:none;box-shadow:inset 0 0 0 #0f001a, 0px 10px 20px -10px #0f001a;background-color:rgba(15, 0, 26, 0.8)}.svelteit-accordion-body.svelte-4k7w0y{display:block;padding:20px;border-right:1px solid transparent;border-bottom:0px solid transparent;border-left:1px solid transparent;border-top:1px solid transparent}.svelteit-accordion-body.svelte-4k7w0y:last-child{padding:20px;cursor:pointer;border-bottom:1px solid transparent;border-top:1px solid transparent}.outlined.primary.svelte-4k7w0y{border-color:#9100ff;color:#9100ff;background-color:#ffffff}.outlined.primary.svelte-4k7w0y:hover{background-color:#9100ff;color:#f4e6ff}.outlined.secondary.svelte-4k7w0y{border-color:#826c93;color:#826c93;background-color:#ffffff}.outlined.secondary.svelte-4k7w0y:hover{background-color:#826c93;color:#f4e6ff}.outlined.success.svelte-4k7w0y{border-color:#47c639;color:#47c639;background-color:#ffffff}.outlined.success.svelte-4k7w0y:hover{background-color:#47c639;color:#f4e6ff}.outlined.danger.svelte-4k7w0y{border-color:#ff006e;color:#ff006e;background-color:#ffffff}.outlined.danger.svelte-4k7w0y:hover{background-color:#ff006e;color:#f4e6ff}.outlined.warning.svelte-4k7w0y{border-color:#ffa600;color:#ffa600;background-color:#ffffff}.outlined.warning.svelte-4k7w0y:hover{background-color:#ffa600;color:#f4e6ff}.outlined.info.svelte-4k7w0y{border-color:#00d8ff;color:#00d8ff;background-color:#ffffff}.outlined.info.svelte-4k7w0y:hover{background-color:#00d8ff;color:#f4e6ff}.outlined.light.svelte-4k7w0y{border-color:#f4e6ff;color:#0f001a;background-color:#ffffff}.outlined.light.svelte-4k7w0y:hover{background-color:#f4e6ff;color:#0f001a}.outlined.dark.svelte-4k7w0y{border-color:#0f001a;color:#0f001a;background-color:#ffffff}.outlined.dark.svelte-4k7w0y:hover{background-color:#0f001a;color:#f4e6ff}.primary.svelte-4k7w0y{background-color:#9100ff;color:#ffffff}.primary.svelte-4k7w0y:hover{background-color:#9100ff;color:#ffffff}.secondary.svelte-4k7w0y{background-color:#826c93;color:#ffffff}.secondary.svelte-4k7w0y:hover{background-color:#826c93;color:#ffffff}.success.svelte-4k7w0y{background-color:#47c639;color:#ffffff}.success.svelte-4k7w0y:hover{background-color:#47c639;color:#ffffff}.danger.svelte-4k7w0y{background-color:#ff006e;color:#ffffff}.danger.svelte-4k7w0y:hover{background-color:#ff006e;color:#f4e6ff}.warning.svelte-4k7w0y{background-color:#ffa600;color:#ffffff}.warning.svelte-4k7w0y:hover{background-color:#ffa600;color:#f4e6ff}.info.svelte-4k7w0y{background-color:#00d8ff;color:#ffffff}.info.svelte-4k7w0y:hover{background-color:#00d8ff;color:#f4e6ff}.light.svelte-4k7w0y{background-color:#f4e6ff;color:#0f001a}.light.svelte-4k7w0y:hover{background-color:#f4e6ff;color:#0f001a}.dark.svelte-4k7w0y{background-color:#0f001a;color:#ffffff}.dark.svelte-4k7w0y:hover{background-color:#0f001a;color:#f4e6ff}.rounded.svelte-4k7w0y{border-radius:4px}.block.svelte-4k7w0y{display:inline-block;width:100%}.outlined.primary.svelteit-accordion-body.svelte-4k7w0y{border-color:#9100ff;color:#0f001a;background-color:#ffffff}.outlined.secondary.svelteit-accordion-body.svelte-4k7w0y{border-color:#826c93;color:#0f001a;background-color:#ffffff}.outlined.success.svelteit-accordion-body.svelte-4k7w0y{border-color:#47c639;color:#0f001a;background-color:#ffffff}.outlined.danger.svelteit-accordion-body.svelte-4k7w0y{border-color:#ff006e;color:#0f001a;background-color:#ffffff}.outlined.warning.svelteit-accordion-body.svelte-4k7w0y{border-color:#ffa600;color:#0f001a;background-color:#ffffff}.outlined.info.svelteit-accordion-body.svelte-4k7w0y{border-color:#00d8ff;color:#0f001a;background-color:#ffffff}.outlined.light.svelteit-accordion-body.svelte-4k7w0y{border-color:#f4e6ff;color:#0f001a;background-color:#ffffff}.outlined.dark.svelteit-accordion-body.svelte-4k7w0y{border-color:#0f001a;color:#0f001a;background-color:#ffffff}.control.svelte-4k7w0y{float:right;font-size:20px}";
    	append(document.head, style);
    }

    const get_title_slot_changes = dirty => ({});
    const get_title_slot_context = ctx => ({});

    // (390:2) {#if control}
    function create_if_block_1$3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*id*/ ctx[0] == /*openedAccordion*/ ctx[1]) return create_if_block_2$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (393:4) {:else}
    function create_else_block$1(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "+";
    			attr(span, "class", "control svelte-4k7w0y");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (391:4) {#if id == openedAccordion}
    function create_if_block_2$2(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "-";
    			attr(span, "class", "control svelte-4k7w0y");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (400:0) {#if id == openedAccordion}
    function create_if_block$7(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[21].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[20], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "svelteit-accordion-body svelte-4k7w0y");
    			toggle_class(div, "primary", /*primary*/ ctx[2]);
    			toggle_class(div, "secondary", /*secondary*/ ctx[3]);
    			toggle_class(div, "success", /*success*/ ctx[4]);
    			toggle_class(div, "danger", /*danger*/ ctx[5]);
    			toggle_class(div, "warning", /*warning*/ ctx[6]);
    			toggle_class(div, "info", /*info*/ ctx[7]);
    			toggle_class(div, "light", /*light*/ ctx[8]);
    			toggle_class(div, "dark", /*dark*/ ctx[9]);
    			toggle_class(div, "outline", /*outline*/ ctx[11]);
    			toggle_class(div, "small", /*small*/ ctx[12]);
    			toggle_class(div, "medium", /*medium*/ ctx[13]);
    			toggle_class(div, "large", /*large*/ ctx[14]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[15]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[16]);
    			toggle_class(div, "block", /*block*/ ctx[17]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1048576) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[20], dirty, null, null);
    				}
    			}

    			if (dirty & /*primary*/ 4) {
    				toggle_class(div, "primary", /*primary*/ ctx[2]);
    			}

    			if (dirty & /*secondary*/ 8) {
    				toggle_class(div, "secondary", /*secondary*/ ctx[3]);
    			}

    			if (dirty & /*success*/ 16) {
    				toggle_class(div, "success", /*success*/ ctx[4]);
    			}

    			if (dirty & /*danger*/ 32) {
    				toggle_class(div, "danger", /*danger*/ ctx[5]);
    			}

    			if (dirty & /*warning*/ 64) {
    				toggle_class(div, "warning", /*warning*/ ctx[6]);
    			}

    			if (dirty & /*info*/ 128) {
    				toggle_class(div, "info", /*info*/ ctx[7]);
    			}

    			if (dirty & /*light*/ 256) {
    				toggle_class(div, "light", /*light*/ ctx[8]);
    			}

    			if (dirty & /*dark*/ 512) {
    				toggle_class(div, "dark", /*dark*/ ctx[9]);
    			}

    			if (dirty & /*outline*/ 2048) {
    				toggle_class(div, "outline", /*outline*/ ctx[11]);
    			}

    			if (dirty & /*small*/ 4096) {
    				toggle_class(div, "small", /*small*/ ctx[12]);
    			}

    			if (dirty & /*medium*/ 8192) {
    				toggle_class(div, "medium", /*medium*/ ctx[13]);
    			}

    			if (dirty & /*large*/ 16384) {
    				toggle_class(div, "large", /*large*/ ctx[14]);
    			}

    			if (dirty & /*disabled*/ 1024) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			}

    			if (dirty & /*outlined*/ 32768) {
    				toggle_class(div, "outlined", /*outlined*/ ctx[15]);
    			}

    			if (dirty & /*rounded*/ 65536) {
    				toggle_class(div, "rounded", /*rounded*/ ctx[16]);
    			}

    			if (dirty & /*block*/ 131072) {
    				toggle_class(div, "block", /*block*/ ctx[17]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(
    						div,
    						slide,
    						{
    							delay: 0,
    							duration: 350,
    							easing: quintOut
    						},
    						true
    					);

    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);

    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(
    					div,
    					slide,
    					{
    						delay: 0,
    						duration: 350,
    						easing: quintOut
    					},
    					false
    				);

    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*control*/ ctx[18] && create_if_block_1$3(ctx);
    	const title_slot_template = /*#slots*/ ctx[21].title;
    	const title_slot = create_slot(title_slot_template, ctx, /*$$scope*/ ctx[20], get_title_slot_context);
    	let if_block1 = /*id*/ ctx[0] == /*openedAccordion*/ ctx[1] && create_if_block$7(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (title_slot) title_slot.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr(div, "class", "svelteit-accordion-header svelte-4k7w0y");
    			toggle_class(div, "primary", /*primary*/ ctx[2]);
    			toggle_class(div, "secondary", /*secondary*/ ctx[3]);
    			toggle_class(div, "success", /*success*/ ctx[4]);
    			toggle_class(div, "danger", /*danger*/ ctx[5]);
    			toggle_class(div, "warning", /*warning*/ ctx[6]);
    			toggle_class(div, "info", /*info*/ ctx[7]);
    			toggle_class(div, "light", /*light*/ ctx[8]);
    			toggle_class(div, "dark", /*dark*/ ctx[9]);
    			toggle_class(div, "outline", /*outline*/ ctx[11]);
    			toggle_class(div, "small", /*small*/ ctx[12]);
    			toggle_class(div, "medium", /*medium*/ ctx[13]);
    			toggle_class(div, "large", /*large*/ ctx[14]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			toggle_class(div, "outlined", /*outlined*/ ctx[15]);
    			toggle_class(div, "rounded", /*rounded*/ ctx[16]);
    			toggle_class(div, "block", /*block*/ ctx[17]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t0);

    			if (title_slot) {
    				title_slot.m(div, null);
    			}

    			insert(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div, "click", /*click_handler*/ ctx[22]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*control*/ ctx[18]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$3(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (title_slot) {
    				if (title_slot.p && dirty & /*$$scope*/ 1048576) {
    					update_slot(title_slot, title_slot_template, ctx, /*$$scope*/ ctx[20], dirty, get_title_slot_changes, get_title_slot_context);
    				}
    			}

    			if (dirty & /*primary*/ 4) {
    				toggle_class(div, "primary", /*primary*/ ctx[2]);
    			}

    			if (dirty & /*secondary*/ 8) {
    				toggle_class(div, "secondary", /*secondary*/ ctx[3]);
    			}

    			if (dirty & /*success*/ 16) {
    				toggle_class(div, "success", /*success*/ ctx[4]);
    			}

    			if (dirty & /*danger*/ 32) {
    				toggle_class(div, "danger", /*danger*/ ctx[5]);
    			}

    			if (dirty & /*warning*/ 64) {
    				toggle_class(div, "warning", /*warning*/ ctx[6]);
    			}

    			if (dirty & /*info*/ 128) {
    				toggle_class(div, "info", /*info*/ ctx[7]);
    			}

    			if (dirty & /*light*/ 256) {
    				toggle_class(div, "light", /*light*/ ctx[8]);
    			}

    			if (dirty & /*dark*/ 512) {
    				toggle_class(div, "dark", /*dark*/ ctx[9]);
    			}

    			if (dirty & /*outline*/ 2048) {
    				toggle_class(div, "outline", /*outline*/ ctx[11]);
    			}

    			if (dirty & /*small*/ 4096) {
    				toggle_class(div, "small", /*small*/ ctx[12]);
    			}

    			if (dirty & /*medium*/ 8192) {
    				toggle_class(div, "medium", /*medium*/ ctx[13]);
    			}

    			if (dirty & /*large*/ 16384) {
    				toggle_class(div, "large", /*large*/ ctx[14]);
    			}

    			if (dirty & /*disabled*/ 1024) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			}

    			if (dirty & /*outlined*/ 32768) {
    				toggle_class(div, "outlined", /*outlined*/ ctx[15]);
    			}

    			if (dirty & /*rounded*/ 65536) {
    				toggle_class(div, "rounded", /*rounded*/ ctx[16]);
    			}

    			if (dirty & /*block*/ 131072) {
    				toggle_class(div, "block", /*block*/ ctx[17]);
    			}

    			if (/*id*/ ctx[0] == /*openedAccordion*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*id, openedAccordion*/ 3) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$7(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(title_slot, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(title_slot, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (title_slot) title_slot.d(detaching);
    			if (detaching) detach(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const dispatch = createEventDispatcher();
    	let { id = 0 } = $$props;
    	let { openedAccordion = 0 } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { disabled = false } = $$props;
    	let { outline = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { outlined = false } = $$props;
    	let { rounded = false } = $$props;
    	let { block = false } = $$props;
    	let { control = false } = $$props;
    	const click_handler = () => dispatch("accordionSelected", id);

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("openedAccordion" in $$props) $$invalidate(1, openedAccordion = $$props.openedAccordion);
    		if ("primary" in $$props) $$invalidate(2, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(3, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(4, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(5, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(6, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(7, info = $$props.info);
    		if ("light" in $$props) $$invalidate(8, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(9, dark = $$props.dark);
    		if ("disabled" in $$props) $$invalidate(10, disabled = $$props.disabled);
    		if ("outline" in $$props) $$invalidate(11, outline = $$props.outline);
    		if ("small" in $$props) $$invalidate(12, small = $$props.small);
    		if ("medium" in $$props) $$invalidate(13, medium = $$props.medium);
    		if ("large" in $$props) $$invalidate(14, large = $$props.large);
    		if ("outlined" in $$props) $$invalidate(15, outlined = $$props.outlined);
    		if ("rounded" in $$props) $$invalidate(16, rounded = $$props.rounded);
    		if ("block" in $$props) $$invalidate(17, block = $$props.block);
    		if ("control" in $$props) $$invalidate(18, control = $$props.control);
    		if ("$$scope" in $$props) $$invalidate(20, $$scope = $$props.$$scope);
    	};

    	return [
    		id,
    		openedAccordion,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		disabled,
    		outline,
    		small,
    		medium,
    		large,
    		outlined,
    		rounded,
    		block,
    		control,
    		dispatch,
    		$$scope,
    		slots,
    		click_handler
    	];
    }

    class Accordion extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-4k7w0y-style")) add_css$d();

    		init(this, options, instance$e, create_fragment$f, safe_not_equal, {
    			id: 0,
    			openedAccordion: 1,
    			primary: 2,
    			secondary: 3,
    			success: 4,
    			danger: 5,
    			warning: 6,
    			info: 7,
    			light: 8,
    			dark: 9,
    			disabled: 10,
    			outline: 11,
    			small: 12,
    			medium: 13,
    			large: 14,
    			outlined: 15,
    			rounded: 16,
    			block: 17,
    			control: 18
    		});
    	}
    }

    /* src/Modal.svelte generated by Svelte v3.29.4 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-zrey1y-style";
    	style.textContent = ".bg.svelte-zrey1y{position:fixed;z-index:1001;display:flex;flex-direction:column;justify-content:center;width:100vw;height:100vh;background:rgba(145, 0, 255, 0.66);top:0;left:0}.window-wrap.svelte-zrey1y{position:relative;margin:2rem;max-height:100%}.window.svelte-zrey1y{position:relative;width:40rem;max-width:100%;max-height:100%;margin:2rem auto;color:#0f001a;border-radius:4px;background:#ffffff}.content.svelte-zrey1y{position:relative;padding:1rem;max-height:calc(100vh - 4rem);overflow:auto}.close.svelte-zrey1y{display:block;box-sizing:border-box;position:absolute;z-index:1000;top:1rem;right:1rem;margin:0;padding:0;width:1.5rem;height:1.5rem;border:0;color:#0f001a;border-radius:1.5rem;background:#ffffff;box-shadow:0 0 0 1px #0f001a;transition:transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);-webkit-appearance:none}.close.svelte-zrey1y:before,.close.svelte-zrey1y:after{content:'';display:block;box-sizing:border-box;position:absolute;top:50%;width:1rem;height:1px;background:#0f001a;transform-origin:center;transition:height 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)}.close.svelte-zrey1y:before{-webkit-transform:translate(0, -50%) rotate(45deg);-moz-transform:translate(0, -50%) rotate(45deg);transform:translate(0, -50%) rotate(45deg);left:0.25rem}.close.svelte-zrey1y:after{-webkit-transform:translate(0, -50%) rotate(-45deg);-moz-transform:translate(0, -50%) rotate(-45deg);transform:translate(0, -50%) rotate(-45deg);left:0.25rem}.close.svelte-zrey1y:hover{background:black;cursor:pointer}.close.svelte-zrey1y:hover:before,.close.svelte-zrey1y:hover:after{height:2px;background:#ffffff}.close.svelte-zrey1y:focus{border-color:#3399ff;box-shadow:0 0 0 2px #3399ff}.close.svelte-zrey1y:active{transform:scale(0.9)}.close.svelte-zrey1y:hover,.close.svelte-zrey1y:focus,.close.svelte-zrey1y:active{outline:none}";
    	append(document.head, style);
    }

    // (185:2) {#if Component}
    function create_if_block$8(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let t;
    	let div0;
    	let switch_instance;
    	let div1_transition;
    	let div3_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*state*/ ctx[0].closeButton && create_if_block_1$4(ctx);
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*Component*/ ctx[1];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div0 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr(div0, "class", "content svelte-zrey1y");
    			attr(div0, "style", /*cssContent*/ ctx[7]);
    			attr(div1, "class", "window svelte-zrey1y");
    			attr(div1, "style", /*cssWindow*/ ctx[6]);
    			attr(div2, "class", "window-wrap svelte-zrey1y");
    			attr(div3, "class", "bg svelte-zrey1y");
    			attr(div3, "style", /*cssBg*/ ctx[5]);
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div1);
    			if (if_block) if_block.m(div1, null);
    			append(div1, t);
    			append(div1, div0);

    			if (switch_instance) {
    				mount_component(switch_instance, div0, null);
    			}

    			/*div2_binding*/ ctx[27](div2);
    			/*div3_binding*/ ctx[28](div3);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div3, "click", /*handleOuterClick*/ ctx[12]);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*state*/ ctx[0].closeButton) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					if_block.m(div1, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const switch_instance_changes = (dirty[0] & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*Component*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div0, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}

    			if (!current || dirty[0] & /*cssContent*/ 128) {
    				attr(div0, "style", /*cssContent*/ ctx[7]);
    			}

    			if (!current || dirty[0] & /*cssWindow*/ 64) {
    				attr(div1, "style", /*cssWindow*/ ctx[6]);
    			}

    			if (!current || dirty[0] & /*cssBg*/ 32) {
    				attr(div3, "style", /*cssBg*/ ctx[5]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[9], /*state*/ ctx[0].transitionWindowProps, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[8], /*state*/ ctx[0].transitionBgProps, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, /*currentTransitionWindow*/ ctx[9], /*state*/ ctx[0].transitionWindowProps, false);
    			div1_transition.run(0);
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, /*currentTransitionBg*/ ctx[8], /*state*/ ctx[0].transitionBgProps, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (if_block) if_block.d();
    			if (switch_instance) destroy_component(switch_instance);
    			if (detaching && div1_transition) div1_transition.end();
    			/*div2_binding*/ ctx[27](null);
    			/*div3_binding*/ ctx[28](null);
    			if (detaching && div3_transition) div3_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (197:10) {#if state.closeButton}
    function create_if_block_1$4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			attr(button, "class", "close svelte-zrey1y");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*close*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$g(ctx) {
    	let div;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*Component*/ ctx[1] && create_if_block$8(ctx);
    	const default_slot_template = /*#slots*/ ctx[26].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[25], null);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			if (default_slot) default_slot.c();
    			attr(div, "class", "svelteit-modal");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(window, "keyup", /*handleKeyup*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*Component*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*Component*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty[0] & /*$$scope*/ 33554432) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[25], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { key = "svelteit-modal" } = $$props;
    	let { closeButton = true } = $$props;
    	let { closeOnEsc = true } = $$props;
    	let { closeOnOuterClick = true } = $$props;
    	let { styleBg = { top: 0, left: 0 } } = $$props;
    	let { styleWindow = {} } = $$props;
    	let { styleContent = {} } = $$props;
    	let { setContext: setContext$1 = setContext } = $$props;
    	let { transitionBg = fade } = $$props;
    	let { transitionBgProps = { duration: 250 } } = $$props;
    	let { transitionWindow = transitionBg } = $$props;
    	let { transitionWindowProps = transitionBgProps } = $$props;

    	const defaultState = {
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindow,
    		styleContent,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps
    	};

    	let state = { ...defaultState };
    	let Component = null;
    	let props = null;
    	let background;
    	let wrap;
    	const camelCaseToDash = str => str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();
    	const toCssString = props => Object.keys(props).reduce((str, key) => `${str}; ${camelCaseToDash(key)}: ${props[key]}`, "");

    	const open = (NewComponent, newProps = {}, options = {}) => {
    		$$invalidate(1, Component = NewComponent);
    		$$invalidate(2, props = newProps);
    		$$invalidate(0, state = { ...defaultState, ...options });
    	};

    	const close = () => {
    		$$invalidate(1, Component = null);
    		$$invalidate(2, props = null);
    	};

    	const handleKeyup = ({ key }) => {
    		if (state.closeOnEsc && Component && key === "Escape") {
    			event.preventDefault();
    			close();
    		}
    	};

    	const handleOuterClick = event => {
    		if (state.closeOnOuterClick && (event.target === background || event.target === wrap)) {
    			event.preventDefault();
    			close();
    		}
    	};

    	setContext$1(key, { open, close });

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrap = $$value;
    			$$invalidate(4, wrap);
    		});
    	}

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			background = $$value;
    			$$invalidate(3, background);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("key" in $$props) $$invalidate(13, key = $$props.key);
    		if ("closeButton" in $$props) $$invalidate(14, closeButton = $$props.closeButton);
    		if ("closeOnEsc" in $$props) $$invalidate(15, closeOnEsc = $$props.closeOnEsc);
    		if ("closeOnOuterClick" in $$props) $$invalidate(16, closeOnOuterClick = $$props.closeOnOuterClick);
    		if ("styleBg" in $$props) $$invalidate(17, styleBg = $$props.styleBg);
    		if ("styleWindow" in $$props) $$invalidate(18, styleWindow = $$props.styleWindow);
    		if ("styleContent" in $$props) $$invalidate(19, styleContent = $$props.styleContent);
    		if ("setContext" in $$props) $$invalidate(20, setContext$1 = $$props.setContext);
    		if ("transitionBg" in $$props) $$invalidate(21, transitionBg = $$props.transitionBg);
    		if ("transitionBgProps" in $$props) $$invalidate(22, transitionBgProps = $$props.transitionBgProps);
    		if ("transitionWindow" in $$props) $$invalidate(23, transitionWindow = $$props.transitionWindow);
    		if ("transitionWindowProps" in $$props) $$invalidate(24, transitionWindowProps = $$props.transitionWindowProps);
    		if ("$$scope" in $$props) $$invalidate(25, $$scope = $$props.$$scope);
    	};

    	let cssBg;
    	let cssWindow;
    	let cssContent;
    	let currentTransitionBg;
    	let currentTransitionWindow;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(5, cssBg = toCssString(state.styleBg));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(6, cssWindow = toCssString(state.styleWindow));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(7, cssContent = toCssString(state.styleContent));
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(8, currentTransitionBg = state.transitionBg);
    		}

    		if ($$self.$$.dirty[0] & /*state*/ 1) {
    			 $$invalidate(9, currentTransitionWindow = state.transitionWindow);
    		}
    	};

    	return [
    		state,
    		Component,
    		props,
    		background,
    		wrap,
    		cssBg,
    		cssWindow,
    		cssContent,
    		currentTransitionBg,
    		currentTransitionWindow,
    		close,
    		handleKeyup,
    		handleOuterClick,
    		key,
    		closeButton,
    		closeOnEsc,
    		closeOnOuterClick,
    		styleBg,
    		styleWindow,
    		styleContent,
    		setContext$1,
    		transitionBg,
    		transitionBgProps,
    		transitionWindow,
    		transitionWindowProps,
    		$$scope,
    		slots,
    		div2_binding,
    		div3_binding
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-zrey1y-style")) add_css$e();

    		init(
    			this,
    			options,
    			instance$f,
    			create_fragment$g,
    			safe_not_equal,
    			{
    				key: 13,
    				closeButton: 14,
    				closeOnEsc: 15,
    				closeOnOuterClick: 16,
    				styleBg: 17,
    				styleWindow: 18,
    				styleContent: 19,
    				setContext: 20,
    				transitionBg: 21,
    				transitionBgProps: 22,
    				transitionWindow: 23,
    				transitionWindowProps: 24
    			},
    			[-1, -1]
    		);
    	}
    }

    /* src/Navigation.svelte generated by Svelte v3.29.4 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-v6ij2s-style";
    	style.textContent = ".svelteit-topnav.svelte-v6ij2s.svelte-v6ij2s{background-color:#f4e6ff;overflow:hidden}.svelteit-topnav.svelte-v6ij2s ul.svelte-v6ij2s{list-style-type:none;margin:0;padding:0}.svelteit-topnav.svelte-v6ij2s a.svelte-v6ij2s{float:left;display:block;color:#0f001a;text-align:center;padding:10px;text-decoration:none;font-size:1rem}.svelteit-topnav.svelte-v6ij2s a.svelte-v6ij2s:hover{background-color:#a733ff;color:#ffffff}.svelteit-topnav.svelte-v6ij2s a.active.svelte-v6ij2s{background-color:#9100ff;color:#ffffff}.svelteit-topnav.svelte-v6ij2s li.icon.svelte-v6ij2s{display:none}.svelteit-topnav.svelte-v6ij2s input[type='text'].svelte-v6ij2s{float:right;padding:5px;border:none;width:20%;margin-top:8px;margin-right:16px;font-size:1rem}.svelteit-brand.svelte-v6ij2s.svelte-v6ij2s{float:left;margin:0;padding:0;height:100%;vertical-align:middle}.svelteit-brand.svelte-v6ij2s img.svelte-v6ij2s{max-width:100%;max-height:100%;margin:0 auto;vertical-align:middle;height:100%;width:100%}.svelteit-brand.svelte-v6ij2s a.svelte-v6ij2s:hover{background:#f4e6ff}@media screen and (max-width: 600px){.svelteit-topnav.svelte-v6ij2s a.svelte-v6ij2s:not(:first-child){display:none}.responsive-items.svelte-v6ij2s.svelte-v6ij2s{display:none}.svelteit-topnav.svelte-v6ij2s li.icon.svelte-v6ij2s{float:right;display:block}}@media screen and (max-width: 600px){.svelteit-topnav.responsive.svelte-v6ij2s.svelte-v6ij2s{position:relative}.svelteit-topnav.responsive.svelte-v6ij2s li.icon.svelte-v6ij2s{position:absolute;right:0;top:0}.svelteit-topnav.responsive.svelte-v6ij2s a.svelte-v6ij2s{display:block;text-align:left}.svelteit-topnav.svelte-v6ij2s .svelteit-brand.svelte-v6ij2s{float:left;display:block}.svelteit-topnav.svelte-v6ij2s a.svelte-v6ij2s,.svelteit-topnav.svelte-v6ij2s input[type='text'].svelte-v6ij2s{display:block;text-align:left;width:100%;margin:0;padding:10px}.svelteit-topnav.svelte-v6ij2s input[type='text'].svelte-v6ij2s{border:1px solid #f4e6ff}}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (113:4) {#if brand}
    function create_if_block_2$3(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;

    	return {
    		c() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			if (img.src !== (img_src_value = /*brand*/ ctx[2])) attr(img, "src", img_src_value);
    			attr(img, "alt", "");
    			attr(img, "class", "svelte-v6ij2s");
    			attr(a, "href", "javascript:void(0);");
    			attr(a, "class", "svelte-v6ij2s");
    			attr(div, "class", "svelteit-brand svelte-v6ij2s");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a);
    			append(a, img);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*brand*/ 4 && img.src !== (img_src_value = /*brand*/ ctx[2])) {
    				attr(img, "src", img_src_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (121:4) {#each items as item}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t_value = /*item*/ ctx[10].title + "";
    	let t;
    	let a_href_value;
    	let a_style_value;
    	let li_class_value;

    	return {
    		c() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr(a, "href", a_href_value = /*item*/ ctx[10].link);
    			attr(a, "style", a_style_value = `color:${/*textColor*/ ctx[6]};`);
    			attr(a, "class", "svelte-v6ij2s");
    			toggle_class(a, "active", /*segment*/ ctx[3] === /*item*/ ctx[10].segment);
    			attr(li, "class", li_class_value = "" + (null_to_empty(` ${/*visible*/ ctx[0] ? "" : "responsive-items"}`) + " svelte-v6ij2s"));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);
    			append(a, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 256 && t_value !== (t_value = /*item*/ ctx[10].title + "")) set_data(t, t_value);

    			if (dirty & /*items*/ 256 && a_href_value !== (a_href_value = /*item*/ ctx[10].link)) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty & /*textColor*/ 64 && a_style_value !== (a_style_value = `color:${/*textColor*/ ctx[6]};`)) {
    				attr(a, "style", a_style_value);
    			}

    			if (dirty & /*segment, items*/ 264) {
    				toggle_class(a, "active", /*segment*/ ctx[3] === /*item*/ ctx[10].segment);
    			}

    			if (dirty & /*visible*/ 1 && li_class_value !== (li_class_value = "" + (null_to_empty(` ${/*visible*/ ctx[0] ? "" : "responsive-items"}`) + " svelte-v6ij2s"))) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    // (132:4) {#if search}
    function create_if_block_1$5(ctx) {
    	let li;
    	let input;
    	let li_class_value;

    	return {
    		c() {
    			li = element("li");
    			input = element("input");
    			attr(input, "type", "text");
    			attr(input, "placeholder", "Search..");
    			attr(input, "class", "svelte-v6ij2s");
    			attr(li, "class", li_class_value = "" + (null_to_empty(` ${/*visible*/ ctx[0] ? "" : "responsive-items"}`) + " svelte-v6ij2s"));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, input);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*visible*/ 1 && li_class_value !== (li_class_value = "" + (null_to_empty(` ${/*visible*/ ctx[0] ? "" : "responsive-items"}`) + " svelte-v6ij2s"))) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    // (138:4) {#if responsive}
    function create_if_block$9(ctx) {
    	let li;
    	let a;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			li = element("li");
    			a = element("a");
    			a.textContent = "☰";
    			attr(a, "href", "javascript:void(0);");
    			attr(a, "class", "svelte-v6ij2s");
    			attr(li, "class", "icon svelte-v6ij2s");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);

    			if (!mounted) {
    				dispose = listen(a, "click", /*toggleVisible*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$h(ctx) {
    	let nav;
    	let ul;
    	let t0;
    	let t1;
    	let t2;
    	let nav_class_value;
    	let nav_style_value;
    	let if_block0 = /*brand*/ ctx[2] && create_if_block_2$3(ctx);
    	let each_value = /*items*/ ctx[8];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*search*/ ctx[1] && create_if_block_1$5(ctx);
    	let if_block2 = /*responsive*/ ctx[7] && create_if_block$9(ctx);

    	return {
    		c() {
    			nav = element("nav");
    			ul = element("ul");
    			if (if_block0) if_block0.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			attr(ul, "class", "svelte-v6ij2s");
    			attr(nav, "class", nav_class_value = "" + (null_to_empty(`svelteit-topnav ${/*visible*/ ctx[0] ? "responsive" : ""}`) + " svelte-v6ij2s"));
    			attr(nav, "style", nav_style_value = `background:${/*bgColor*/ ctx[5]};`);
    			toggle_class(nav, "active", /*active*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, ul);
    			if (if_block0) if_block0.m(ul, null);
    			append(ul, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append(ul, t1);
    			if (if_block1) if_block1.m(ul, null);
    			append(ul, t2);
    			if (if_block2) if_block2.m(ul, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*brand*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$3(ctx);
    					if_block0.c();
    					if_block0.m(ul, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*visible, items, textColor, segment*/ 329) {
    				each_value = /*items*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t1);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*search*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$5(ctx);
    					if_block1.c();
    					if_block1.m(ul, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*responsive*/ ctx[7]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$9(ctx);
    					if_block2.c();
    					if_block2.m(ul, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*visible*/ 1 && nav_class_value !== (nav_class_value = "" + (null_to_empty(`svelteit-topnav ${/*visible*/ ctx[0] ? "responsive" : ""}`) + " svelte-v6ij2s"))) {
    				attr(nav, "class", nav_class_value);
    			}

    			if (dirty & /*bgColor*/ 32 && nav_style_value !== (nav_style_value = `background:${/*bgColor*/ ctx[5]};`)) {
    				attr(nav, "style", nav_style_value);
    			}

    			if (dirty & /*visible, active*/ 17) {
    				toggle_class(nav, "active", /*active*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(nav);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { visible = false } = $$props;
    	let { search = false } = $$props;
    	let { brand = undefined } = $$props;
    	let { segment = undefined } = $$props;
    	let { active = false } = $$props;
    	let { bgColor = undefined } = $$props;
    	let { textColor = undefined } = $$props;
    	let { responsive = undefined } = $$props;
    	let { items = [] } = $$props;

    	const toggleVisible = () => {
    		$$invalidate(0, visible = !visible);
    	};

    	$$self.$$set = $$props => {
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    		if ("search" in $$props) $$invalidate(1, search = $$props.search);
    		if ("brand" in $$props) $$invalidate(2, brand = $$props.brand);
    		if ("segment" in $$props) $$invalidate(3, segment = $$props.segment);
    		if ("active" in $$props) $$invalidate(4, active = $$props.active);
    		if ("bgColor" in $$props) $$invalidate(5, bgColor = $$props.bgColor);
    		if ("textColor" in $$props) $$invalidate(6, textColor = $$props.textColor);
    		if ("responsive" in $$props) $$invalidate(7, responsive = $$props.responsive);
    		if ("items" in $$props) $$invalidate(8, items = $$props.items);
    	};

    	return [
    		visible,
    		search,
    		brand,
    		segment,
    		active,
    		bgColor,
    		textColor,
    		responsive,
    		items,
    		toggleVisible
    	];
    }

    class Navigation extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-v6ij2s-style")) add_css$f();

    		init(this, options, instance$g, create_fragment$h, safe_not_equal, {
    			visible: 0,
    			search: 1,
    			brand: 2,
    			segment: 3,
    			active: 4,
    			bgColor: 5,
    			textColor: 6,
    			responsive: 7,
    			items: 8
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/Tabs.svelte generated by Svelte v3.29.4 */

    function create_fragment$i(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "tabs");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    const TABS = {};

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const tabs = [];
    	const panels = [];
    	const selectedTab = writable(null);
    	const selectedPanel = writable(null);

    	setContext(TABS, {
    		registerTab: tab => {
    			tabs.push(tab);
    			selectedTab.update(current => current || tab);

    			onDestroy(() => {
    				const i = tabs.indexOf(tab);
    				tabs.splice(i, 1);

    				selectedTab.update(current => current === tab
    				? tabs[i] || tabs[tabs.length - 1]
    				: current);
    			});
    		},
    		registerPanel: panel => {
    			panels.push(panel);
    			selectedPanel.update(current => current || panel);

    			onDestroy(() => {
    				const i = panels.indexOf(panel);
    				panels.splice(i, 1);

    				selectedPanel.update(current => current === panel
    				? panels[i] || panels[panels.length - 1]
    				: current);
    			});
    		},
    		selectTab: tab => {
    			const i = tabs.indexOf(tab);
    			selectedTab.set(tab);
    			selectedPanel.set(panels[i]);
    		},
    		selectedTab,
    		selectedPanel
    	});

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$i, safe_not_equal, {});
    	}
    }

    /* src/TabList.svelte generated by Svelte v3.29.4 */

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-o52x6f-style";
    	style.textContent = ".tab-list.svelte-o52x6f{border-bottom:1px solid #9100ff}";
    	append(document.head, style);
    }

    function create_fragment$j(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "tab-list svelte-o52x6f");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class TabList extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-o52x6f-style")) add_css$g();
    		init(this, options, instance$i, create_fragment$j, safe_not_equal, {});
    	}
    }

    /* src/TabPanel.svelte generated by Svelte v3.29.4 */

    function add_css$h() {
    	var style = element("style");
    	style.id = "svelte-99i6pn-style";
    	style.textContent = ".tabs-panel.svelte-99i6pn{padding:10px}";
    	append(document.head, style);
    }

    // (14:0) {#if $selectedPanel === panel}
    function create_if_block$a(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "tabs-panel svelte-99i6pn");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1] && create_if_block$a(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$selectedPanel*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$a(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let $selectedPanel;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const panel = {};
    	const { registerPanel, selectedPanel } = getContext(TABS);
    	component_subscribe($$self, selectedPanel, value => $$invalidate(0, $selectedPanel = value));
    	registerPanel(panel);

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [$selectedPanel, panel, selectedPanel, $$scope, slots];
    }

    class TabPanel extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-99i6pn-style")) add_css$h();
    		init(this, options, instance$j, create_fragment$k, safe_not_equal, {});
    	}
    }

    /* src/Tab.svelte generated by Svelte v3.29.4 */

    function add_css$i() {
    	var style = element("style");
    	style.id = "svelte-1ys83dh-style";
    	style.textContent = "button.svelte-1ys83dh{background:none;border:none;border-bottom:2px solid #ffffff;margin:0;color:#d399ff;padding:10px;cursor:pointer;outline:none}button.selected.svelte-1ys83dh{border-bottom:2px solid #9100ff;color:#9100ff;outline:none;font-weight:bold}";
    	append(document.head, style);
    }

    function create_fragment$l(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr(button, "class", "svelte-1ys83dh");
    			toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (dirty & /*$selectedTab, tab*/ 3) {
    				toggle_class(button, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$k($$self, $$props, $$invalidate) {
    	let $selectedTab;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const tab = {};
    	const { registerTab, selectTab, selectedTab } = getContext(TABS);
    	component_subscribe($$self, selectedTab, value => $$invalidate(0, $selectedTab = value));
    	registerTab(tab);
    	const click_handler = () => selectTab(tab);

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [$selectedTab, tab, selectTab, selectedTab, $$scope, slots, click_handler];
    }

    class Tab extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1ys83dh-style")) add_css$i();
    		init(this, options, instance$k, create_fragment$l, safe_not_equal, {});
    	}
    }

    /* src/Breadcrumbs.svelte generated by Svelte v3.29.4 */

    function add_css$j() {
    	var style = element("style");
    	style.id = "svelte-6xw28d-style";
    	style.textContent = "nav.svelte-6xw28d ul.svelte-6xw28d.svelte-6xw28d{padding:10px 16px;list-style:none;background-color:#f4e6ff}nav.svelte-6xw28d ul li.svelte-6xw28d.svelte-6xw28d{display:inline}nav.svelte-6xw28d ul li.svelte-6xw28d+li.svelte-6xw28d:before{padding:8px;color:#0f001a;content:'/\\00a0'}nav.svelte-6xw28d ul li a.svelte-6xw28d.svelte-6xw28d{color:inherit;text-decoration:none}nav.svelte-6xw28d ul li a.svelte-6xw28d.svelte-6xw28d:hover{color:inherit;text-decoration:underline}";
    	append(document.head, style);
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (45:4) {#each list as item}
    function create_each_block$1(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[2].title + "";
    	let t0;
    	let a_href_value;
    	let t1;

    	return {
    		c() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(a, "href", a_href_value = /*item*/ ctx[2].href);
    			attr(a, "class", "svelte-6xw28d");
    			attr(li, "class", "svelte-6xw28d");
    			toggle_class(li, "active", /*active*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);
    			append(a, t0);
    			append(li, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*list*/ 2 && t0_value !== (t0_value = /*item*/ ctx[2].title + "")) set_data(t0, t0_value);

    			if (dirty & /*list*/ 2 && a_href_value !== (a_href_value = /*item*/ ctx[2].href)) {
    				attr(a, "href", a_href_value);
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(li, "active", /*active*/ ctx[0]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    function create_fragment$m(ctx) {
    	let nav;
    	let ul;
    	let each_value = /*list*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			nav = element("nav");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", "svelte-6xw28d");
    			attr(nav, "class", "breadcrumb svelte-6xw28d");
    			attr(nav, "aria-label", "breadcrumbs");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*active, list*/ 3) {
    				each_value = /*list*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let { active } = $$props;
    	let { list } = $$props;

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("list" in $$props) $$invalidate(1, list = $$props.list);
    	};

    	return [active, list];
    }

    class Breadcrumbs extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-6xw28d-style")) add_css$j();
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, { active: 0, list: 1 });
    	}
    }

    /* src/Pagination.svelte generated by Svelte v3.29.4 */

    function add_css$k() {
    	var style = element("style");
    	style.id = "svelte-vwkssp-style";
    	style.textContent = ".pagination.svelte-vwkssp.svelte-vwkssp{display:flex;justify-content:center;margin-top:10px}.pagination.svelte-vwkssp ul.svelte-vwkssp{display:flex;padding-left:0;list-style:none}.pagination.svelte-vwkssp ul li a.svelte-vwkssp{position:relative;display:block;padding:0.5rem 0.75rem;margin-left:-1px;line-height:1.25;background-color:#ffffff;border:1px solid #f4e6ff;text-decoration:none}.pagination.svelte-vwkssp ul li a.svelte-vwkssp:hover{color:#9100ff;background-color:#f4e6ff;border-color:#f4e6ff;text-decoration:none}.pagination.svelte-vwkssp ul li.active a.svelte-vwkssp{color:#ffffff;background-color:#9100ff;border-color:#9100ff;text-decoration:none}.pagination.svelte-vwkssp ul li a.svelte-vwkssp:hover:not(li.active){color:#9100ff;background-color:#f4e6ff;border-color:#f4e6ff;text-decoration:none}.pagination.svelte-vwkssp ul li.disabled a.svelte-vwkssp{color:#6600b3;pointer-events:none;cursor:auto;border-color:#f4e6ff}";
    	append(document.head, style);
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (79:4) {#each range(last_page, 1) as page}
    function create_each_block$2(ctx) {
    	let li;
    	let a;
    	let t_value = /*page*/ ctx[11] + "";
    	let t;
    	let li_class_value;
    	let mounted;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[8](/*page*/ ctx[11], ...args);
    	}

    	return {
    		c() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr(a, "href", "javascript:void(0)");
    			attr(a, "class", "svelte-vwkssp");

    			attr(li, "class", li_class_value = /*page*/ ctx[11] === /*current_page*/ ctx[0]
    			? "active"
    			: "");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, a);
    			append(a, t);

    			if (!mounted) {
    				dispose = listen(a, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*last_page*/ 2 && t_value !== (t_value = /*page*/ ctx[11] + "")) set_data(t, t_value);

    			if (dirty & /*last_page, current_page*/ 3 && li_class_value !== (li_class_value = /*page*/ ctx[11] === /*current_page*/ ctx[0]
    			? "active"
    			: "")) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$n(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let li0_class_value;
    	let t1;
    	let t2;
    	let li1;
    	let a1;
    	let li1_class_value;
    	let mounted;
    	let dispose;
    	let each_value = range(/*last_page*/ ctx[1], 1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.innerHTML = `<span aria-hidden="true">«</span>`;
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.innerHTML = `<span aria-hidden="true">»</span>`;
    			attr(a0, "href", "javascript:void(0)");
    			attr(a0, "class", "svelte-vwkssp");
    			attr(li0, "class", li0_class_value = /*current_page*/ ctx[0] === 1 ? "disabled" : "");
    			attr(a1, "href", "javascript:void(0)");
    			attr(a1, "class", "svelte-vwkssp");

    			attr(li1, "class", li1_class_value = /*current_page*/ ctx[0] === /*last_page*/ ctx[1]
    			? "disabled"
    			: "");

    			attr(ul, "class", "svelte-vwkssp");
    			attr(nav, "class", "pagination svelte-vwkssp");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, ul);
    			append(ul, li0);
    			append(li0, a0);
    			append(ul, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append(ul, t2);
    			append(ul, li1);
    			append(li1, a1);

    			if (!mounted) {
    				dispose = [
    					listen(a0, "click", /*click_handler*/ ctx[7]),
    					listen(a1, "click", /*click_handler_2*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*current_page*/ 1 && li0_class_value !== (li0_class_value = /*current_page*/ ctx[0] === 1 ? "disabled" : "")) {
    				attr(li0, "class", li0_class_value);
    			}

    			if (dirty & /*range, last_page, current_page, changePage*/ 7) {
    				each_value = range(/*last_page*/ ctx[1], 1);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*current_page, last_page*/ 3 && li1_class_value !== (li1_class_value = /*current_page*/ ctx[0] === /*last_page*/ ctx[1]
    			? "disabled"
    			: "")) {
    				attr(li1, "class", li1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function range(size, startAt = 0) {
    	return [...Array(size).keys()].map(i => i + startAt);
    }

    function instance$m($$self, $$props, $$invalidate) {
    	let { current_page = undefined } = $$props;
    	let { last_page = undefined } = $$props;
    	const per_page = undefined;
    	const from = undefined;
    	const to = undefined;
    	const total = undefined;
    	const dispatch = createEventDispatcher();

    	function changePage(page) {
    		if (page !== current_page) {
    			dispatch("change", page);
    		}
    	}

    	const click_handler = () => changePage(current_page - 1);
    	const click_handler_1 = page => changePage(page);
    	const click_handler_2 = () => changePage(current_page + 1);

    	$$self.$$set = $$props => {
    		if ("current_page" in $$props) $$invalidate(0, current_page = $$props.current_page);
    		if ("last_page" in $$props) $$invalidate(1, last_page = $$props.last_page);
    	};

    	return [
    		current_page,
    		last_page,
    		changePage,
    		per_page,
    		from,
    		to,
    		total,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Pagination extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-vwkssp-style")) add_css$k();

    		init(this, options, instance$m, create_fragment$n, safe_not_equal, {
    			current_page: 0,
    			last_page: 1,
    			per_page: 3,
    			from: 4,
    			to: 5,
    			total: 6
    		});
    	}

    	get per_page() {
    		return this.$$.ctx[3];
    	}

    	get from() {
    		return this.$$.ctx[4];
    	}

    	get to() {
    		return this.$$.ctx[5];
    	}

    	get total() {
    		return this.$$.ctx[6];
    	}
    }

    /* src/Image.svelte generated by Svelte v3.29.4 */

    function add_css$l() {
    	var style = element("style");
    	style.id = "svelte-2md61p-style";
    	style.textContent = ".hero-image.svelte-2md61p.svelte-2md61p{background-position:center;background-repeat:no-repeat;background-size:cover;position:relative}.hero-image.svelte-2md61p .hero-text.svelte-2md61p{text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);color:#ffffff}.hero-image.svelte-2md61p .hero-text h1.svelte-2md61p{line-height:1.8}@media(max-width: 768px){.hero-image.svelte-2md61p .hero-text h1.svelte-2md61p{font-size:25px}}img.img-thumbnail.svelte-2md61p.svelte-2md61p{padding:5px}img.img-thumbnail.svelte-2md61p.svelte-2md61p:hover{box-shadow:0 8px 16px 0 rgba(0, 0, 0, 0.2)}.img-fluid.svelte-2md61p.svelte-2md61p{max-width:100%;height:auto}.img-circle.svelte-2md61p.svelte-2md61p{min-width:25px;min-height:25px;display:inline-block;border-radius:100%;overflow:hidden;vertical-align:middle}";
    	append(document.head, style);
    }

    // (94:20) 
    function create_if_block_4$1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*linkRoute*/ ctx[7]) return create_if_block_5$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (92:17) 
    function create_if_block_3$2(ctx) {
    	let img_1;
    	let img_1_src_value;

    	return {
    		c() {
    			img_1 = element("img");
    			if (img_1.src !== (img_1_src_value = /*img*/ ctx[0])) attr(img_1, "src", img_1_src_value);
    			attr(img_1, "alt", /*title*/ ctx[1]);
    			attr(img_1, "class", "img-circle svelte-2md61p");
    			attr(img_1, "width", /*width*/ ctx[5]);
    			attr(img_1, "height", /*height*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, img_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*img*/ 1 && img_1.src !== (img_1_src_value = /*img*/ ctx[0])) {
    				attr(img_1, "src", img_1_src_value);
    			}

    			if (dirty & /*title*/ 2) {
    				attr(img_1, "alt", /*title*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 32) {
    				attr(img_1, "width", /*width*/ ctx[5]);
    			}

    			if (dirty & /*height*/ 16) {
    				attr(img_1, "height", /*height*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(img_1);
    		}
    	};
    }

    // (63:0) {#if hero}
    function create_if_block$b(ctx) {
    	let div1;
    	let div0;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let div1_style_value;
    	let current;
    	let if_block0 = /*description*/ ctx[2] && create_if_block_2$4(ctx);
    	let if_block1 = /*buttonRoute*/ ctx[6] && create_if_block_1$6(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text(/*title*/ ctx[1]);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr(h1, "class", "svelte-2md61p");
    			attr(div0, "class", "hero-text svelte-2md61p");
    			attr(div1, "class", "hero-image svelte-2md61p");

    			attr(div1, "style", div1_style_value = `height: ${/*height*/ ctx[4]}px;background-image: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)),
      url(${/*img*/ ctx[0]});`);
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, h1);
    			append(h1, t0);
    			append(div0, t1);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t2);
    			if (if_block1) if_block1.m(div0, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*title*/ 2) set_data(t0, /*title*/ ctx[1]);

    			if (/*description*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$4(ctx);
    					if_block0.c();
    					if_block0.m(div0, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*buttonRoute*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*buttonRoute*/ 64) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1$6(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*height, img*/ 17 && div1_style_value !== (div1_style_value = `height: ${/*height*/ ctx[4]}px;background-image: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)),
      url(${/*img*/ ctx[0]});`)) {
    				attr(div1, "style", div1_style_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    }

    // (104:2) {:else}
    function create_else_block$2(ctx) {
    	let img_1;
    	let img_1_src_value;

    	return {
    		c() {
    			img_1 = element("img");
    			if (img_1.src !== (img_1_src_value = /*img*/ ctx[0])) attr(img_1, "src", img_1_src_value);
    			attr(img_1, "alt", /*title*/ ctx[1]);
    			attr(img_1, "class", "img-thumbnail img-fluid svelte-2md61p");
    			attr(img_1, "width", /*width*/ ctx[5]);
    			attr(img_1, "height", /*height*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, img_1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*img*/ 1 && img_1.src !== (img_1_src_value = /*img*/ ctx[0])) {
    				attr(img_1, "src", img_1_src_value);
    			}

    			if (dirty & /*title*/ 2) {
    				attr(img_1, "alt", /*title*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 32) {
    				attr(img_1, "width", /*width*/ ctx[5]);
    			}

    			if (dirty & /*height*/ 16) {
    				attr(img_1, "height", /*height*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(img_1);
    		}
    	};
    }

    // (95:2) {#if linkRoute}
    function create_if_block_5$1(ctx) {
    	let a;
    	let img_1;
    	let img_1_src_value;

    	return {
    		c() {
    			a = element("a");
    			img_1 = element("img");
    			if (img_1.src !== (img_1_src_value = /*img*/ ctx[0])) attr(img_1, "src", img_1_src_value);
    			attr(img_1, "alt", /*title*/ ctx[1]);
    			attr(img_1, "class", "img-thumbnail img-fluid svelte-2md61p");
    			attr(img_1, "width", /*width*/ ctx[5]);
    			attr(img_1, "height", /*height*/ ctx[4]);
    			attr(a, "href", /*linkRoute*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, img_1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*img*/ 1 && img_1.src !== (img_1_src_value = /*img*/ ctx[0])) {
    				attr(img_1, "src", img_1_src_value);
    			}

    			if (dirty & /*title*/ 2) {
    				attr(img_1, "alt", /*title*/ ctx[1]);
    			}

    			if (dirty & /*width*/ 32) {
    				attr(img_1, "width", /*width*/ ctx[5]);
    			}

    			if (dirty & /*height*/ 16) {
    				attr(img_1, "height", /*height*/ ctx[4]);
    			}

    			if (dirty & /*linkRoute*/ 128) {
    				attr(a, "href", /*linkRoute*/ ctx[7]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    // (70:6) {#if description}
    function create_if_block_2$4(ctx) {
    	let p;
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(/*description*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*description*/ 4) set_data(t, /*description*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (73:6) {#if buttonRoute}
    function create_if_block_1$6(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				title: /*buttonTitle*/ ctx[3],
    				primary: /*primary*/ ctx[11],
    				secondary: /*secondary*/ ctx[12],
    				success: /*success*/ ctx[13],
    				warning: /*warning*/ ctx[15],
    				info: /*info*/ ctx[16],
    				danger: /*danger*/ ctx[14],
    				light: /*light*/ ctx[17],
    				dark: /*dark*/ ctx[18],
    				rounded: /*rounded*/ ctx[22],
    				small: /*small*/ ctx[19],
    				medium: /*medium*/ ctx[20],
    				large: /*large*/ ctx[21]
    			}
    		});

    	button.$on("click", function () {
    		if (is_function(/*buttonRoute*/ ctx[6])) /*buttonRoute*/ ctx[6].apply(this, arguments);
    	});

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};
    			if (dirty & /*buttonTitle*/ 8) button_changes.title = /*buttonTitle*/ ctx[3];
    			if (dirty & /*primary*/ 2048) button_changes.primary = /*primary*/ ctx[11];
    			if (dirty & /*secondary*/ 4096) button_changes.secondary = /*secondary*/ ctx[12];
    			if (dirty & /*success*/ 8192) button_changes.success = /*success*/ ctx[13];
    			if (dirty & /*warning*/ 32768) button_changes.warning = /*warning*/ ctx[15];
    			if (dirty & /*info*/ 65536) button_changes.info = /*info*/ ctx[16];
    			if (dirty & /*danger*/ 16384) button_changes.danger = /*danger*/ ctx[14];
    			if (dirty & /*light*/ 131072) button_changes.light = /*light*/ ctx[17];
    			if (dirty & /*dark*/ 262144) button_changes.dark = /*dark*/ ctx[18];
    			if (dirty & /*rounded*/ 4194304) button_changes.rounded = /*rounded*/ ctx[22];
    			if (dirty & /*small*/ 524288) button_changes.small = /*small*/ ctx[19];
    			if (dirty & /*medium*/ 1048576) button_changes.medium = /*medium*/ ctx[20];
    			if (dirty & /*large*/ 2097152) button_changes.large = /*large*/ ctx[21];
    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    function create_fragment$o(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$b, create_if_block_3$2, create_if_block_4$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*hero*/ ctx[8]) return 0;
    		if (/*avatar*/ ctx[10]) return 1;
    		if (/*thumbnail*/ ctx[9]) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$n($$self, $$props, $$invalidate) {
    	let { img = undefined } = $$props;
    	let { title = undefined } = $$props;
    	let { description = undefined } = $$props;
    	let { buttonTitle = undefined } = $$props;
    	let { height = undefined } = $$props;
    	let { width = undefined } = $$props;
    	let { buttonRoute = undefined } = $$props;
    	let { linkRoute = undefined } = $$props;
    	let { hero = false } = $$props;
    	let { thumbnail = false } = $$props;
    	let { avatar = false } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { small = false } = $$props;
    	let { medium = false } = $$props;
    	let { large = false } = $$props;
    	let { rounded = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("img" in $$props) $$invalidate(0, img = $$props.img);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("description" in $$props) $$invalidate(2, description = $$props.description);
    		if ("buttonTitle" in $$props) $$invalidate(3, buttonTitle = $$props.buttonTitle);
    		if ("height" in $$props) $$invalidate(4, height = $$props.height);
    		if ("width" in $$props) $$invalidate(5, width = $$props.width);
    		if ("buttonRoute" in $$props) $$invalidate(6, buttonRoute = $$props.buttonRoute);
    		if ("linkRoute" in $$props) $$invalidate(7, linkRoute = $$props.linkRoute);
    		if ("hero" in $$props) $$invalidate(8, hero = $$props.hero);
    		if ("thumbnail" in $$props) $$invalidate(9, thumbnail = $$props.thumbnail);
    		if ("avatar" in $$props) $$invalidate(10, avatar = $$props.avatar);
    		if ("primary" in $$props) $$invalidate(11, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(12, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(13, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(14, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(15, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(16, info = $$props.info);
    		if ("light" in $$props) $$invalidate(17, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(18, dark = $$props.dark);
    		if ("small" in $$props) $$invalidate(19, small = $$props.small);
    		if ("medium" in $$props) $$invalidate(20, medium = $$props.medium);
    		if ("large" in $$props) $$invalidate(21, large = $$props.large);
    		if ("rounded" in $$props) $$invalidate(22, rounded = $$props.rounded);
    	};

    	return [
    		img,
    		title,
    		description,
    		buttonTitle,
    		height,
    		width,
    		buttonRoute,
    		linkRoute,
    		hero,
    		thumbnail,
    		avatar,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		small,
    		medium,
    		large,
    		rounded
    	];
    }

    class Image extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-2md61p-style")) add_css$l();

    		init(this, options, instance$n, create_fragment$o, safe_not_equal, {
    			img: 0,
    			title: 1,
    			description: 2,
    			buttonTitle: 3,
    			height: 4,
    			width: 5,
    			buttonRoute: 6,
    			linkRoute: 7,
    			hero: 8,
    			thumbnail: 9,
    			avatar: 10,
    			primary: 11,
    			secondary: 12,
    			success: 13,
    			danger: 14,
    			warning: 15,
    			info: 16,
    			light: 17,
    			dark: 18,
    			small: 19,
    			medium: 20,
    			large: 21,
    			rounded: 22
    		});
    	}
    }

    /* src/Typography.svelte generated by Svelte v3.29.4 */

    function add_css$m() {
    	var style = element("style");
    	style.id = "svelte-v90ob8-style";
    	style.textContent = "h1.svelte-v90ob8{font-size:36px;font-weight:400;margin:10px 0;line-height:2rem}h2.svelte-v90ob8{font-size:30px;font-weight:400;margin:10px 0;line-height:2rem}h3.svelte-v90ob8{font-size:24px;font-weight:400;margin:10px 0;line-height:2rem}h4.svelte-v90ob8{font-size:20px;font-weight:400;margin:10px 0;line-height:2rem}h5.svelte-v90ob8{font-size:18px;font-weight:400;margin:10px 0;line-height:2rem}h6.svelte-v90ob8{font-size:16px;font-weight:400;margin:10px 0;line-height:2rem}";
    	append(document.head, style);
    }

    // (60:12) 
    function create_if_block_6$1(ctx) {
    	let p_1;
    	let t;

    	return {
    		c() {
    			p_1 = element("p");
    			t = text(/*p*/ ctx[7]);
    		},
    		m(target, anchor) {
    			insert(target, p_1, anchor);
    			append(p_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*p*/ 128) set_data(t, /*p*/ ctx[7]);
    		},
    		d(detaching) {
    			if (detaching) detach(p_1);
    		}
    	};
    }

    // (58:13) 
    function create_if_block_5$2(ctx) {
    	let h6_1;
    	let t;

    	return {
    		c() {
    			h6_1 = element("h6");
    			t = text(/*title*/ ctx[0]);
    			attr(h6_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h6_1, anchor);
    			append(h6_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h6_1);
    		}
    	};
    }

    // (56:13) 
    function create_if_block_4$2(ctx) {
    	let h5_1;
    	let t;

    	return {
    		c() {
    			h5_1 = element("h5");
    			t = text(/*title*/ ctx[0]);
    			attr(h5_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h5_1, anchor);
    			append(h5_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h5_1);
    		}
    	};
    }

    // (54:13) 
    function create_if_block_3$3(ctx) {
    	let h4_1;
    	let t;

    	return {
    		c() {
    			h4_1 = element("h4");
    			t = text(/*title*/ ctx[0]);
    			attr(h4_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h4_1, anchor);
    			append(h4_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h4_1);
    		}
    	};
    }

    // (52:13) 
    function create_if_block_2$5(ctx) {
    	let h3_1;
    	let t;

    	return {
    		c() {
    			h3_1 = element("h3");
    			t = text(/*title*/ ctx[0]);
    			attr(h3_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h3_1, anchor);
    			append(h3_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h3_1);
    		}
    	};
    }

    // (50:13) 
    function create_if_block_1$7(ctx) {
    	let h2_1;
    	let t;

    	return {
    		c() {
    			h2_1 = element("h2");
    			t = text(/*title*/ ctx[0]);
    			attr(h2_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h2_1, anchor);
    			append(h2_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h2_1);
    		}
    	};
    }

    // (48:0) {#if h1}
    function create_if_block$c(ctx) {
    	let h1_1;
    	let t;

    	return {
    		c() {
    			h1_1 = element("h1");
    			t = text(/*title*/ ctx[0]);
    			attr(h1_1, "class", "svelte-v90ob8");
    		},
    		m(target, anchor) {
    			insert(target, h1_1, anchor);
    			append(h1_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(h1_1);
    		}
    	};
    }

    function create_fragment$p(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*h1*/ ctx[1]) return create_if_block$c;
    		if (/*h2*/ ctx[2]) return create_if_block_1$7;
    		if (/*h3*/ ctx[3]) return create_if_block_2$5;
    		if (/*h4*/ ctx[4]) return create_if_block_3$3;
    		if (/*h5*/ ctx[5]) return create_if_block_4$2;
    		if (/*h6*/ ctx[6]) return create_if_block_5$2;
    		if (/*p*/ ctx[7]) return create_if_block_6$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$o($$self, $$props, $$invalidate) {
    	let { title = undefined } = $$props;
    	let { h1 = undefined } = $$props;
    	let { h2 = undefined } = $$props;
    	let { h3 = undefined } = $$props;
    	let { h4 = undefined } = $$props;
    	let { h5 = undefined } = $$props;
    	let { h6 = undefined } = $$props;
    	let { p = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("h1" in $$props) $$invalidate(1, h1 = $$props.h1);
    		if ("h2" in $$props) $$invalidate(2, h2 = $$props.h2);
    		if ("h3" in $$props) $$invalidate(3, h3 = $$props.h3);
    		if ("h4" in $$props) $$invalidate(4, h4 = $$props.h4);
    		if ("h5" in $$props) $$invalidate(5, h5 = $$props.h5);
    		if ("h6" in $$props) $$invalidate(6, h6 = $$props.h6);
    		if ("p" in $$props) $$invalidate(7, p = $$props.p);
    	};

    	return [title, h1, h2, h3, h4, h5, h6, p];
    }

    class Typography extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-v90ob8-style")) add_css$m();

    		init(this, options, instance$o, create_fragment$p, safe_not_equal, {
    			title: 0,
    			h1: 1,
    			h2: 2,
    			h3: 3,
    			h4: 4,
    			h5: 5,
    			h6: 6,
    			p: 7
    		});
    	}
    }

    var cssVars = (e,t)=>{let r=new Set(Object.keys(t));return r.forEach(r=>{e.style.setProperty(`--${r}`,t[r]);}),{update(t){const o=new Set(Object.keys(t));o.forEach(o=>{e.style.setProperty(`--${o}`,t[o]),r.delete(o);}),r.forEach(t=>e.style.removeProperty(`--${t}`)),r=o;}}};

    /* src/Switch.svelte generated by Svelte v3.29.4 */

    function add_css$n() {
    	var style = element("style");
    	style.id = "svelte-1u8ip98-style";
    	style.textContent = ".svelteit-switch.svelte-1u8ip98.svelte-1u8ip98{position:relative;display:inline-block;width:60px;height:34px}.svelteit-switch.svelte-1u8ip98 input.svelte-1u8ip98{opacity:0;width:0;height:0}.svelteit-slider.svelte-1u8ip98.svelte-1u8ip98{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:var(--unCheckedColor);-webkit-transition:0.4s;transition:0.4s;border-radius:34px}.svelteit-slider.svelte-1u8ip98.svelte-1u8ip98:before{position:absolute;content:'';height:26px;width:26px;left:4px;bottom:4px;background-color:white;-webkit-transition:0.4s;transition:0.4s;border-radius:50%}input.svelte-1u8ip98:checked+.svelteit-slider.svelte-1u8ip98{background-color:var(--checkedColor)}input.svelte-1u8ip98:checked+.svelteit-slider.svelte-1u8ip98{box-shadow:0 0 1px var(--checkedColor)}input.svelte-1u8ip98:checked+.svelteit-slider.svelte-1u8ip98:before{-webkit-transform:translateX(26px);-ms-transform:translateX(26px);transform:translateX(26px)}";
    	append(document.head, style);
    }

    function create_fragment$q(ctx) {
    	let label;
    	let input;
    	let t;
    	let span;
    	let cssVars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t = space();
    			span = element("span");
    			attr(input, "type", "checkbox");
    			input.disabled = /*disabled*/ ctx[1];
    			attr(input, "class", "svelte-1u8ip98");
    			attr(span, "class", "svelteit-slider svelte-1u8ip98");
    			attr(label, "class", "svelteit-switch svelte-1u8ip98");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			input.checked = /*checked*/ ctx[0];
    			append(label, t);
    			append(label, span);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_handler*/ ctx[5]),
    					action_destroyer(cssVars_action = cssVars.call(null, label, /*styleVars*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*disabled*/ 2) {
    				input.disabled = /*disabled*/ ctx[1];
    			}

    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (cssVars_action && is_function(cssVars_action.update) && dirty & /*styleVars*/ 4) cssVars_action.update.call(null, /*styleVars*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(label);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$p($$self, $$props, $$invalidate) {
    	let { checked = false } = $$props;
    	let { disabled = false } = $$props;
    	let { checkedColor = "green" } = $$props;
    	let { unCheckedColor = "red" } = $$props;

    	function input_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	$$self.$$set = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("checkedColor" in $$props) $$invalidate(3, checkedColor = $$props.checkedColor);
    		if ("unCheckedColor" in $$props) $$invalidate(4, unCheckedColor = $$props.unCheckedColor);
    	};

    	let styleVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checkedColor, unCheckedColor*/ 24) {
    			 $$invalidate(2, styleVars = { checkedColor, unCheckedColor });
    		}
    	};

    	return [
    		checked,
    		disabled,
    		styleVars,
    		checkedColor,
    		unCheckedColor,
    		input_change_handler
    	];
    }

    class Switch extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1u8ip98-style")) add_css$n();

    		init(this, options, instance$p, create_fragment$q, safe_not_equal, {
    			checked: 0,
    			disabled: 1,
    			checkedColor: 3,
    			unCheckedColor: 4
    		});
    	}
    }

    /* src/Tooltip.svelte generated by Svelte v3.29.4 */

    function add_css$o() {
    	var style = element("style");
    	style.id = "svelte-qyyj9s-style";
    	style.textContent = ".svelteit-tooltip.svelte-qyyj9s.svelte-qyyj9s{position:relative;display:inline-block;border-bottom:1px dotted black;cursor:pointer}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.svelte-qyyj9s{visibility:hidden;width:140px;background-color:black;color:#fff;text-align:center;border-radius:6px;padding:5px 0;position:absolute;z-index:1}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.primary.svelte-qyyj9s{background-color:#9100ff;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.secondary.svelte-qyyj9s{background-color:#826c93;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.success.svelte-qyyj9s{background-color:#47c639;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.danger.svelte-qyyj9s{background-color:#ff006e;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.warning.svelte-qyyj9s{background-color:#ffa600;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.info.svelte-qyyj9s{background-color:#00d8ff;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.light.svelte-qyyj9s{background-color:#f4e6ff;color:black}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.dark.svelte-qyyj9s{background-color:#0f001a;color:white}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.top.svelte-qyyj9s{width:120px;bottom:100%;left:50%;margin-left:-60px}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.right.svelte-qyyj9s{top:-5px;left:105%}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.bottom.svelte-qyyj9s{width:120px;top:100%;left:50%;margin-left:-60px}.svelteit-tooltip.svelte-qyyj9s .tooltiptext.left.svelte-qyyj9s{top:-5px;right:105%}.svelteit-tooltip.svelte-qyyj9s:hover .tooltiptext.svelte-qyyj9s{visibility:visible}";
    	append(document.head, style);
    }

    function create_fragment$r(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let span;
    	let t2;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			t2 = text(/*body*/ ctx[1]);
    			attr(span, "class", "tooltiptext svelte-qyyj9s");
    			toggle_class(span, "top", /*top*/ ctx[2]);
    			toggle_class(span, "right", /*right*/ ctx[3]);
    			toggle_class(span, "bottom", /*bottom*/ ctx[4]);
    			toggle_class(span, "left", /*left*/ ctx[5]);
    			toggle_class(span, "primary", /*primary*/ ctx[6]);
    			toggle_class(span, "secondary", /*secondary*/ ctx[7]);
    			toggle_class(span, "success", /*success*/ ctx[8]);
    			toggle_class(span, "danger", /*danger*/ ctx[9]);
    			toggle_class(span, "warning", /*warning*/ ctx[10]);
    			toggle_class(span, "info", /*info*/ ctx[11]);
    			toggle_class(span, "light", /*light*/ ctx[12]);
    			toggle_class(span, "dark", /*dark*/ ctx[13]);
    			attr(div, "class", "svelteit-tooltip svelte-qyyj9s");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, span);
    			append(span, t2);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data(t0, /*title*/ ctx[0]);
    			if (dirty & /*body*/ 2) set_data(t2, /*body*/ ctx[1]);

    			if (dirty & /*top*/ 4) {
    				toggle_class(span, "top", /*top*/ ctx[2]);
    			}

    			if (dirty & /*right*/ 8) {
    				toggle_class(span, "right", /*right*/ ctx[3]);
    			}

    			if (dirty & /*bottom*/ 16) {
    				toggle_class(span, "bottom", /*bottom*/ ctx[4]);
    			}

    			if (dirty & /*left*/ 32) {
    				toggle_class(span, "left", /*left*/ ctx[5]);
    			}

    			if (dirty & /*primary*/ 64) {
    				toggle_class(span, "primary", /*primary*/ ctx[6]);
    			}

    			if (dirty & /*secondary*/ 128) {
    				toggle_class(span, "secondary", /*secondary*/ ctx[7]);
    			}

    			if (dirty & /*success*/ 256) {
    				toggle_class(span, "success", /*success*/ ctx[8]);
    			}

    			if (dirty & /*danger*/ 512) {
    				toggle_class(span, "danger", /*danger*/ ctx[9]);
    			}

    			if (dirty & /*warning*/ 1024) {
    				toggle_class(span, "warning", /*warning*/ ctx[10]);
    			}

    			if (dirty & /*info*/ 2048) {
    				toggle_class(span, "info", /*info*/ ctx[11]);
    			}

    			if (dirty & /*light*/ 4096) {
    				toggle_class(span, "light", /*light*/ ctx[12]);
    			}

    			if (dirty & /*dark*/ 8192) {
    				toggle_class(span, "dark", /*dark*/ ctx[13]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance$q($$self, $$props, $$invalidate) {
    	let { title = undefined } = $$props;
    	let { body = undefined } = $$props;
    	let { top = undefined } = $$props;
    	let { right = undefined } = $$props;
    	let { bottom = undefined } = $$props;
    	let { left = undefined } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("body" in $$props) $$invalidate(1, body = $$props.body);
    		if ("top" in $$props) $$invalidate(2, top = $$props.top);
    		if ("right" in $$props) $$invalidate(3, right = $$props.right);
    		if ("bottom" in $$props) $$invalidate(4, bottom = $$props.bottom);
    		if ("left" in $$props) $$invalidate(5, left = $$props.left);
    		if ("primary" in $$props) $$invalidate(6, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(7, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(8, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(9, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(10, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(11, info = $$props.info);
    		if ("light" in $$props) $$invalidate(12, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(13, dark = $$props.dark);
    	};

    	return [
    		title,
    		body,
    		top,
    		right,
    		bottom,
    		left,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark
    	];
    }

    class Tooltip extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qyyj9s-style")) add_css$o();

    		init(this, options, instance$q, create_fragment$r, safe_not_equal, {
    			title: 0,
    			body: 1,
    			top: 2,
    			right: 3,
    			bottom: 4,
    			left: 5,
    			primary: 6,
    			secondary: 7,
    			success: 8,
    			danger: 9,
    			warning: 10,
    			info: 11,
    			light: 12,
    			dark: 13
    		});
    	}
    }

    /* src/Badge.svelte generated by Svelte v3.29.4 */

    function add_css$p() {
    	var style = element("style");
    	style.id = "svelte-17ztafj-style";
    	style.textContent = ".svelteit-badge.svelte-17ztafj{display:inline;padding:0.2em 0.6em 0.3em;font-size:75%;font-weight:700;line-height:1;text-align:center;white-space:nowrap;vertical-align:baseline;border-radius:0.25em;background-color:#0f001a;color:#ffffff}.svelteit-badge.primary.svelte-17ztafj{background-color:#9100ff;color:white}.svelteit-badge.primary.outlined.svelte-17ztafj{border:1px solid #9100ff;color:#9100ff;background-color:#ffffff}.svelteit-badge.secondary.svelte-17ztafj{background-color:#826c93;color:white}.svelteit-badge.secondary.outlined.svelte-17ztafj{border:1px solid #826c93;color:#826c93;background-color:#ffffff}.svelteit-badge.success.svelte-17ztafj{background-color:#47c639;color:white}.svelteit-badge.success.outlined.svelte-17ztafj{border:1px solid #47c639;color:#47c639;background-color:#ffffff}.svelteit-badge.danger.svelte-17ztafj{background-color:#ff006e;color:white}.svelteit-badge.danger.outlined.svelte-17ztafj{border:1px solid #ff006e;color:#ff006e;background-color:#ffffff}.svelteit-badge.warning.svelte-17ztafj{background-color:#ffa600;color:white}.svelteit-badge.warning.outlined.svelte-17ztafj{border:1px solid #ffa600;color:#ffa600;background-color:#ffffff}.svelteit-badge.info.svelte-17ztafj{background-color:#00d8ff;color:white}.svelteit-badge.info.outlined.svelte-17ztafj{border:1px solid #00d8ff;color:#00d8ff;background-color:#ffffff}.svelteit-badge.light.svelte-17ztafj{background-color:#f4e6ff;color:black}.svelteit-badge.light.outlined.svelte-17ztafj{border:1px solid #f4e6ff;color:black;background-color:#ffffff}.svelteit-badge.dark.svelte-17ztafj{background-color:#0f001a;color:white}.svelteit-badge.dark.outlined.svelte-17ztafj{border:1px solid #0f001a;color:#0f001a;background-color:#ffffff}.svelteit-badge.badge.svelte-17ztafj{display:inline-block;min-width:30px;padding:3px 7px;font-size:12px;font-weight:700;line-height:2;text-align:center;white-space:nowrap;vertical-align:middle;border-radius:60px;min-height:20px}";
    	append(document.head, style);
    }

    // (109:36) 
    function create_if_block_1$8(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*badge*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*badge*/ 2) set_data(t, /*badge*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (109:2) {#if label}
    function create_if_block$d(ctx) {
    	let t;

    	return {
    		c() {
    			t = text(/*label*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*label*/ 1) set_data(t, /*label*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$s(ctx) {
    	let span;

    	function select_block_type(ctx, dirty) {
    		if (/*label*/ ctx[0]) return create_if_block$d;
    		if (/*badge*/ ctx[1]) return create_if_block_1$8;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr(span, "class", "svelteit-badge svelte-17ztafj");
    			toggle_class(span, "outlined", /*outlined*/ ctx[10]);
    			toggle_class(span, "primary", /*primary*/ ctx[2]);
    			toggle_class(span, "secondary", /*secondary*/ ctx[3]);
    			toggle_class(span, "success", /*success*/ ctx[4]);
    			toggle_class(span, "danger", /*danger*/ ctx[5]);
    			toggle_class(span, "warning", /*warning*/ ctx[6]);
    			toggle_class(span, "info", /*info*/ ctx[7]);
    			toggle_class(span, "light", /*light*/ ctx[8]);
    			toggle_class(span, "dark", /*dark*/ ctx[9]);
    			toggle_class(span, "badge", /*badge*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}

    			if (dirty & /*outlined*/ 1024) {
    				toggle_class(span, "outlined", /*outlined*/ ctx[10]);
    			}

    			if (dirty & /*primary*/ 4) {
    				toggle_class(span, "primary", /*primary*/ ctx[2]);
    			}

    			if (dirty & /*secondary*/ 8) {
    				toggle_class(span, "secondary", /*secondary*/ ctx[3]);
    			}

    			if (dirty & /*success*/ 16) {
    				toggle_class(span, "success", /*success*/ ctx[4]);
    			}

    			if (dirty & /*danger*/ 32) {
    				toggle_class(span, "danger", /*danger*/ ctx[5]);
    			}

    			if (dirty & /*warning*/ 64) {
    				toggle_class(span, "warning", /*warning*/ ctx[6]);
    			}

    			if (dirty & /*info*/ 128) {
    				toggle_class(span, "info", /*info*/ ctx[7]);
    			}

    			if (dirty & /*light*/ 256) {
    				toggle_class(span, "light", /*light*/ ctx[8]);
    			}

    			if (dirty & /*dark*/ 512) {
    				toggle_class(span, "dark", /*dark*/ ctx[9]);
    			}

    			if (dirty & /*badge*/ 2) {
    				toggle_class(span, "badge", /*badge*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    function instance$r($$self, $$props, $$invalidate) {
    	let { label = undefined } = $$props;
    	let { badge = undefined } = $$props;
    	let { primary = false } = $$props;
    	let { secondary = false } = $$props;
    	let { success = false } = $$props;
    	let { danger = false } = $$props;
    	let { warning = false } = $$props;
    	let { info = false } = $$props;
    	let { light = false } = $$props;
    	let { dark = false } = $$props;
    	let { outlined = false } = $$props;

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("badge" in $$props) $$invalidate(1, badge = $$props.badge);
    		if ("primary" in $$props) $$invalidate(2, primary = $$props.primary);
    		if ("secondary" in $$props) $$invalidate(3, secondary = $$props.secondary);
    		if ("success" in $$props) $$invalidate(4, success = $$props.success);
    		if ("danger" in $$props) $$invalidate(5, danger = $$props.danger);
    		if ("warning" in $$props) $$invalidate(6, warning = $$props.warning);
    		if ("info" in $$props) $$invalidate(7, info = $$props.info);
    		if ("light" in $$props) $$invalidate(8, light = $$props.light);
    		if ("dark" in $$props) $$invalidate(9, dark = $$props.dark);
    		if ("outlined" in $$props) $$invalidate(10, outlined = $$props.outlined);
    	};

    	return [
    		label,
    		badge,
    		primary,
    		secondary,
    		success,
    		danger,
    		warning,
    		info,
    		light,
    		dark,
    		outlined
    	];
    }

    class Badge extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-17ztafj-style")) add_css$p();

    		init(this, options, instance$r, create_fragment$s, safe_not_equal, {
    			label: 0,
    			badge: 1,
    			primary: 2,
    			secondary: 3,
    			success: 4,
    			danger: 5,
    			warning: 6,
    			info: 7,
    			light: 8,
    			dark: 9,
    			outlined: 10
    		});
    	}
    }

    const Svelteit = {
      Accordion,
      Accordions,
      Alert,
      Badge,
      Breadcrumbs,
      Button,
      ButtonGroup,
      Card,
      CollapsiblePanel,
      Column,
      Container,
      Image,
      Input,
      List,
      Modal,
      Navigation,
      Pagination,
      ProgressBar,
      Row,
      Select,
      Switch,
      Tab,
      Table,
      TabList,
      TabPanel,
      Tabs,
      Textarea,
      Tooltip,
      Typography,
    };

    exports.Accordion = Accordion;
    exports.Accordions = Accordions;
    exports.Alert = Alert;
    exports.Badge = Badge;
    exports.Breadcrumbs = Breadcrumbs;
    exports.Button = Button;
    exports.ButtonGroup = ButtonGroup;
    exports.Card = Card;
    exports.CollapsiblePanel = CollapsiblePanel;
    exports.Column = Column;
    exports.Container = Container;
    exports.Image = Image;
    exports.Input = Input;
    exports.List = List;
    exports.Modal = Modal;
    exports.Navigation = Navigation;
    exports.Pagination = Pagination;
    exports.ProgressBar = ProgressBar;
    exports.Row = Row;
    exports.Select = Select;
    exports.Svelteit = Svelteit;
    exports.Switch = Switch;
    exports.Tab = Tab;
    exports.TabList = TabList;
    exports.TabPanel = TabPanel;
    exports.Table = Table;
    exports.Tabs = Tabs;
    exports.Textarea = Textarea;
    exports.Tooltip = Tooltip;
    exports.Typography = Typography;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
