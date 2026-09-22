const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const core = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const cloud = fs.readFileSync(__dirname + '/supabase-sync.js', 'utf8');
const sql = fs.readFileSync(__dirname + '/supabase-setup.sql', 'utf8');
assert.match(sql, /enable row level security/);
assert.match(sql, /auth\.uid\(\)/);
assert.match(html, /supabase-sync\.js/);

const elements = new Map();
const storage = new Map();
const scheduled = [];
const downloaded = [];
const messages = [];
let remote = null;
let user = { id: 'user-one', email: 'owner@example.com' };

function element(id) {
    if (!elements.has(id)) elements.set(id, {
        value: '', textContent: '', innerText: '', style: {}, children: [],
        addEventListener() {}, appendChild(child) { this.children.push(child); }
    });
    return elements.get(id);
}

function query(kind, value) {
    const conditions = [];
    return {
        select() { return this; },
        eq(field, expected) { conditions.push([field, expected]); return this; },
        async maybeSingle() {
            if (kind === 'read') return { data: remote, error: null };
            if (!remote || conditions.some(([field, expected]) => remote[field] !== expected)) return { data: null, error: null };
            remote = { ...remote, ...value };
            return { data: { revision: remote.revision }, error: null };
        },
        async single() {
            if (remote) return { data: null, error: { code: '23505', message: 'duplicate key' } };
            remote = { ...value };
            return { data: { revision: remote.revision }, error: null };
        }
    };
}

const client = {
    auth: {
        getSession: async () => ({ data: { session: { access_token: 'test' } }, error: null }),
        getUser: async () => ({ data: { user }, error: null }),
        signInWithPassword: async () => ({ data: { user }, error: null }),
        signUp: async () => ({ data: { user, session: null }, error: null }),
        signOut: async () => ({ error: null })
    },
    from(name) {
        assert.equal(name, 'invoice_snapshots');
        return {
            select() { return query('read'); },
            insert(value) { return query('insert', value); },
            update(value) { return query('update', value); }
        };
    }
};

const context = vm.createContext({
    window: { addEventListener() {} },
    supabase: { createClient: () => client },
    document: { getElementById: element, body: { appendChild() {} }, createElement: () => ({
        querySelector: () => ({ addEventListener() {} }), click() {}, remove() {}
    }) },
    localStorage: {
        getItem: key => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
    },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    alert: message => messages.push(message),
    confirm: () => true,
    Blob, CompressionStream, DecompressionStream, Response,
    crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob,
    URL: { createObjectURL: blob => { downloaded.push(blob); return 'blob:test'; }, revokeObjectURL() {} },
    location: { href: 'https://example.github.io/hoa-don/' },
    setTimeout: callback => { scheduled.push(callback); return scheduled.length; },
    clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    console, Date
});
vm.runInContext(core, context);
vm.runInContext(cloud, context);

async function run() {
    vm.runInContext("activePassphrase = 'data-passphrase-123'; billStore = { HD1: { maHD: 'HD1', ngay: '2026-09-22', tenKH: 'Khách thử', sdt: '', soHDDT: '', khachDaTra: 50000, valChuyenKhoan: 50000, items: [] } }", context);
    await context.connectCloud(user);
    assert.equal(remote, null);
    await context.uploadSupabaseSnapshot();
    assert.equal(remote.revision, 1);
    assert.equal(remote.user_id, user.id);
    assert.equal(remote.payload.format, 'kiotviet-encrypted-v1');
    assert.ok(!JSON.stringify(remote.payload).includes('HD1'));
    assert.equal(element('syncStatus').textContent, 'Đã đồng bộ Cloud');

    vm.runInContext("billStore.HD1.tipChuyenKhoan = 10000; markLocalDirty()", context);
    await context.uploadSupabaseSnapshot();
    assert.equal(remote.revision, 2);
    const decoded = await context.decodeSnapshot(remote.payload, 'data-passphrase-123');
    assert.equal(decoded.content.billStore.HD1.tipChuyenKhoan, 10000);

    remote.revision = 3; // another device has saved first
    vm.runInContext("billStore.HD1.tipChuyenKhoan = 20000; markLocalDirty()", context);
    await context.uploadSupabaseSnapshot();
    assert.equal(remote.revision, 3, 'conflicting local change must not overwrite Cloud');
    assert.equal(element('supabaseConflict').style.display, 'block');

    await context.useSupabaseCloud();
    assert.equal(element('supabaseConflict').style.display, 'none', messages.at(-1));
    assert.equal(vm.runInContext('billStore.HD1.tipChuyenKhoan', context), 10000);
    assert.ok(downloaded.length, 'local copy should be backed up before overwrite');
    assert.equal(JSON.parse(storage.get('kv_supabase_sync')).revision, 3);
    vm.runInContext('billStore = {}; rawStore = []; importedFiles = []', context);
    storage.delete('kv_supabase_sync');
    storage.delete('kv_supabase_owner');
    await context.connectCloud(user);
    assert.equal(vm.runInContext('billStore.HD1.tipChuyenKhoan', context), 10000, 'a new device should load Cloud data');
    await context.signOutSupabase();
    vm.runInContext("billStore.HD1.tipChuyenKhoan = 15000; markLocalDirty()", context);
    assert.equal(JSON.parse(storage.get('kv_supabase_sync')).dirty, true, 'offline edits must remain pending');
    await context.connectCloud(user);
    await context.uploadSupabaseSnapshot();
    assert.equal(remote.revision, 4);
    await context.connectCloud({ id: 'different-user', email: 'other@example.com' });
    assert.match(element('syncStatus').textContent, /tài khoản Cloud khác/);
    assert.equal(remote.user_id, 'user-one');
    console.log('Supabase encrypted auto-save, conflict protection, and cloud restore tests passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
