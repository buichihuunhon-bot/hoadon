// Publishable key is intended for browser code. Database access is limited by RLS.
const SUPABASE_URL = 'https://pybfkeyadqereprzhaes.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LoWjA9XFYOZUo22874rEPw_quojAR07';
const cloudClient = globalThis.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kv_supabase_auth' }
}) || null;
const CLOUD_META_KEY = 'kv_supabase_sync';
const CLOUD_OWNER_KEY = 'kv_supabase_owner';
let cloudUser = null;
let cloudRole = null;
let cloudOwnerId = null;
let cloudRevision = null;
let cloudReady = false;
let cloudConflict = false;
let cloudBusy = false;
let cloudDirty = false;
let cloudChangeNumber = 0;
let cloudSaveTimer = null;
let cloudPollTimer = null;

function cloudHasLocalData() {
    return Object.keys(billStore).length > 0 || rawStore.length > 0 || importedFiles.length > 0;
}

function cloudMeta() {
    try { return JSON.parse(localStorage.getItem(CLOUD_META_KEY)) || {}; }
    catch { return {}; }
}

function saveCloudMeta(dirty = cloudDirty) {
    if (!cloudUser) return;
    try {
        localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ userId: cloudUser.id, revision: cloudRevision, dirty }));
    } catch (error) {
        console.error('Không lưu được trạng thái đồng bộ Cloud:', error);
    }
}

function setCloudStatus(message, kind = '') {
    const status = document.getElementById('syncStatus');
    status.textContent = message;
    status.className = `sync-chip ${kind}`.trim();
}

function showCloudConnection() {
    document.getElementById('supabaseLogin').style.display = cloudUser ? 'none' : 'grid';
    document.getElementById('supabaseConnected').style.display = cloudUser ? 'flex' : 'none';
    document.getElementById('supabaseConflict').style.display = cloudConflict ? 'block' : 'none';
    document.getElementById('supabaseAccount').textContent = cloudUser
        ? `${cloudUser.email || 'Tài khoản Cloud'} · ${cloudRole === 'admin' ? 'Admin' : cloudRole === 'accountant' ? 'Kế toán · Chỉ xem' : 'Chưa được phân quyền'}`
        : 'Đăng nhập Supabase để tự lưu và tải dữ liệu giữa các thiết bị.';
}

function canEditInvoices() { return cloudRole === 'admin'; }
window.canEditInvoices = canEditInvoices;

function applyRoleUI() {
    const admin = cloudRole === 'admin';
    document.getElementById('importPanel').style.display = admin ? '' : 'none';
    document.getElementById('deleteDateButton').style.display = admin ? '' : 'none';
    document.getElementById('backupActions').style.display = cloudRole === 'accountant' ? 'none' : '';
    document.getElementById('legacyGist').style.display = admin ? '' : 'none';
    document.getElementById('bankInputs').style.display = admin ? '' : 'none';
    document.getElementById('bankReference').style.display = admin ? '' : 'none';
    document.getElementById('bankReadOnly').style.display = cloudRole === 'accountant' ? 'grid' : 'none';
    document.getElementById('bankSaveNote').style.display = admin ? '' : 'none';
    document.getElementById('paymentCorrectionEditor').style.display = admin ? 'grid' : 'none';
}

function cloudError(error) {
    const message = error?.message || String(error);
    if (/invoice_members/i.test(message)) {
        return 'Chưa thiết lập phân quyền. Hãy chạy file supabase-roles.sql trong Supabase SQL Editor.';
    }
    if (/invoice_snapshots|schema cache|relation .*does not exist/i.test(message)) {
        return 'Chưa tạo bảng Cloud. Hãy chạy file supabase-setup.sql trong Supabase SQL Editor.';
    }
    return message;
}

async function fetchCloudSnapshot() {
    const { data, error } = await cloudClient.from('invoice_snapshots')
        .select('payload,revision').eq('user_id', cloudOwnerId).maybeSingle();
    if (error) throw error;
    return data;
}

async function applyCloudSnapshot(row, backupLocal = false) {
    const changeAtStart = cloudChangeNumber;
    const { content } = await decodeSnapshot(row.payload, activePassphrase);
    if (!validateDataSnapshot(content)) throw new Error('Dữ liệu Cloud không đúng định dạng.');
    if (backupLocal && cloudHasLocalData() && !await exportDataBackup()) {
        throw new Error('Chưa tạo được bản sao lưu dữ liệu trên máy.');
    }
    if (changeAtStart !== cloudChangeNumber) throw new Error('Dữ liệu trên máy vừa thay đổi. Hãy kiểm tra lại Cloud trước khi tải xuống.');
    const files = content.importedFiles || [];
    if (!await saveToLocalStorage(content.billStore, content.rawStore, files)) {
        throw new Error('Không đủ dung lượng lưu trên trình duyệt. Dữ liệu trên máy chưa thay đổi.');
    }
    billStore = content.billStore;
    rawStore = content.rawStore;
    importedFiles = files;
    cloudRevision = row.revision;
    cloudDirty = false;
    cloudConflict = false;
    localStorage.setItem(CLOUD_OWNER_KEY, cloudUser.id);
    saveCloudMeta(false);
    showCloudConnection();
    updateDateDropdown();
    renderDashboard();
    setCloudStatus('Đã cập nhật từ Cloud');
}

function stopCloudPolling() {
    if (cloudPollTimer) clearInterval(cloudPollTimer);
    cloudPollTimer = null;
}

async function connectCloud(user) {
    stopCloudPolling();
    cloudUser = user;
    cloudRole = null;
    cloudOwnerId = null;
    cloudReady = false;
    cloudConflict = false;
    showCloudConnection();
    const existingOwner = localStorage.getItem(CLOUD_OWNER_KEY);
    if (existingOwner && existingOwner !== user.id && cloudHasLocalData()) {
        await cloudClient.auth.signOut();
        cloudUser = null;
        applyRoleUI();
        showCloudConnection();
        setCloudStatus('Dữ liệu máy thuộc tài khoản Cloud khác', 'dirty');
        alert('Dữ liệu trên máy đã gắn với tài khoản Cloud khác. Hãy đăng nhập lại đúng tài khoản, hoặc dùng hồ sơ trình duyệt riêng. Không có dữ liệu nào được tải lên.');
        return;
    }
    try {
        const { data: member, error: memberError } = await cloudClient.from('invoice_members')
            .select('owner_id,role').eq('user_id', user.id).maybeSingle();
        if (memberError) throw memberError;
        if (!member) {
            applyRoleUI();
            showCloudConnection();
            setCloudStatus('Tài khoản chưa được cấp quyền', 'dirty');
            return;
        }
        cloudRole = member.role;
        cloudOwnerId = member.owner_id;
        applyRoleUI();
        showCloudConnection();
        setCloudStatus('Đang kiểm tra Cloud...');
        const row = await fetchCloudSnapshot();
        const meta = cloudMeta();
        cloudRevision = meta.userId === user.id ? meta.revision ?? null : null;
        cloudDirty = meta.userId === user.id && !!meta.dirty || cloudDirty;
        if (cloudRole === 'accountant') {
            if (row) await applyCloudSnapshot(row, cloudHasLocalData() &&
                (meta.userId !== user.id || meta.dirty || cloudDirty));
            else setCloudStatus('Chỉ xem · Admin chưa đưa dữ liệu lên Cloud');
            cloudDirty = false;
            cloudReady = true;
            saveCloudMeta(false);
            cloudPollTimer = setInterval(refreshSupabaseCloud, 30000);
            return;
        }
        if (!row) {
            cloudRevision = null;
            cloudReady = true;
            if (cloudHasLocalData()) queueSupabaseSync(0);
            else {
                localStorage.setItem(CLOUD_OWNER_KEY, user.id);
                saveCloudMeta(false);
                setCloudStatus('Cloud đã sẵn sàng');
            }
        } else if (!cloudHasLocalData()) {
            await applyCloudSnapshot(row);
            cloudReady = true;
        } else if (meta.userId === user.id && meta.revision === row.revision) {
            cloudRevision = row.revision;
            cloudReady = true;
            if (cloudDirty) queueSupabaseSync(0);
            else setCloudStatus('Đã đồng bộ Cloud');
        } else if (meta.userId === user.id && !cloudDirty && !meta.dirty) {
            await applyCloudSnapshot(row);
            cloudReady = true;
        } else {
            cloudConflict = true;
            showCloudConnection();
            setCloudStatus('Cần chọn bản dữ liệu', 'dirty');
        }
        if (cloudReady) cloudPollTimer = setInterval(refreshSupabaseCloud, 30000);
    } catch (error) {
        setCloudStatus(`Chưa kết nối Cloud: ${cloudError(error)}`, 'dirty');
    }
}

async function startSupabaseSync() {
    if (!activePassphrase) return;
    if (!cloudClient) {
        setCloudStatus('Không tải được thư viện Cloud; dữ liệu vẫn lưu trên máy', 'dirty');
        return;
    }
    try {
        const { data: sessionData, error: sessionError } = await cloudClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
            cloudUser = null;
            cloudRole = null;
            cloudOwnerId = null;
            applyRoleUI();
            showCloudConnection();
            setCloudStatus('Lưu trên máy · Chưa đăng nhập Cloud', 'dirty');
            return;
        }
        const { data, error } = await cloudClient.auth.getUser();
        if (error) throw error;
        if (data.user) await connectCloud(data.user);
        else {
            cloudUser = null;
            cloudRole = null;
            cloudOwnerId = null;
            applyRoleUI();
            showCloudConnection();
            setCloudStatus('Lưu trên máy · Chưa đăng nhập Cloud', 'dirty');
        }
    } catch (error) {
        setCloudStatus(`Chưa kết nối Cloud: ${cloudError(error)}`, 'dirty');
    }
}

async function signInSupabase() {
    if (!cloudClient) return alert('Không tải được thư viện Supabase. Hãy kiểm tra kết nối Internet và tải lại trang.');
    const email = document.getElementById('supabaseEmail').value.trim();
    const password = document.getElementById('supabasePassword').value;
    if (!email || !password) return alert('Vui lòng nhập email và mật khẩu tài khoản Cloud.');
    try {
        setCloudStatus('Đang đăng nhập Cloud...');
        const { data, error } = await cloudClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        document.getElementById('supabasePassword').value = '';
        await connectCloud(data.user);
    } catch (error) {
        setCloudStatus('Đăng nhập Cloud thất bại', 'dirty');
        alert(`Không đăng nhập được: ${cloudError(error)}`);
    }
}

async function signUpSupabase() {
    if (!cloudClient) return alert('Không tải được thư viện Supabase. Hãy kiểm tra kết nối Internet.');
    const email = document.getElementById('supabaseEmail').value.trim();
    const password = document.getElementById('supabasePassword').value;
    if (!email || password.length < 8) return alert('Nhập email và mật khẩu tài khoản Cloud ít nhất 8 ký tự.');
    try {
        const options = location.protocol === 'https:'
            ? { emailRedirectTo: location.href.split(/[?#]/)[0] } : undefined;
        const { data, error } = await cloudClient.auth.signUp({ email, password, options });
        if (error) throw error;
        document.getElementById('supabasePassword').value = '';
        if (data.session && data.user) await connectCloud(data.user);
        else alert('Đã gửi email xác nhận. Hãy mở email, xác nhận tài khoản rồi quay lại đăng nhập Cloud.');
    } catch (error) {
        alert(`Không tạo được tài khoản: ${cloudError(error)}`);
    }
}

async function signOutSupabase() {
    if (!cloudClient) return;
    if (cloudDirty && !confirm('Dữ liệu trên máy còn thay đổi chưa đồng bộ. Vẫn đăng xuất Cloud?')) return;
    const { error } = await cloudClient.auth.signOut();
    if (error) return alert(`Không đăng xuất được: ${cloudError(error)}`);
    stopCloudPolling();
    cloudUser = null;
    cloudRole = null;
    cloudOwnerId = null;
    cloudReady = false;
    cloudConflict = false;
    applyRoleUI();
    showCloudConnection();
    setCloudStatus('Lưu trên máy · Đã đăng xuất Cloud', 'dirty');
}

function queueSupabaseSync(delay = 1200) {
    if (cloudRole === 'accountant') return;
    cloudDirty = true;
    cloudChangeNumber++;
    if (cloudUser) saveCloudMeta(true);
    else {
        const meta = cloudMeta();
        if (meta.userId) {
            try { localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ ...meta, dirty: true })); }
            catch (error) { console.error('Không lưu được trạng thái chờ đồng bộ:', error); }
        }
    }
    if (!cloudUser || !cloudReady || cloudConflict) {
        setCloudStatus(cloudConflict ? 'Cần chọn bản dữ liệu' : 'Đang chờ đồng bộ Cloud', 'dirty');
        return;
    }
    setCloudStatus('Đang chờ lưu Cloud...', 'dirty');
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(uploadSupabaseSnapshot, delay);
}
window.queueSupabaseSync = queueSupabaseSync;
window.startSupabaseSync = startSupabaseSync;
window.markSupabaseImported = function() {
    if (cloudRole === 'accountant') return;
    cloudDirty = true;
    cloudChangeNumber++;
    clearTimeout(cloudSaveTimer);
    if (cloudUser && cloudRevision !== null) {
        cloudConflict = true;
        saveCloudMeta(true);
        showCloudConnection();
        setCloudStatus('Dữ liệu vừa khôi phục · Cần chọn bản', 'dirty');
    } else if (cloudUser && cloudReady) queueSupabaseSync(0);
};

async function uploadSupabaseSnapshot() {
    if (!cloudUser || cloudRole !== 'admin' || !cloudReady || cloudConflict || cloudBusy || !activePassphrase || !cloudDirty) return;
    cloudBusy = true;
    const changeAtStart = cloudChangeNumber;
    try {
        setCloudStatus('Đang lưu lên Cloud...', 'dirty');
        const payload = await encryptSnapshot(currentDataSnapshot(), activePassphrase);
        let result;
        if (cloudRevision === null) {
            result = await cloudClient.from('invoice_snapshots')
                .insert({ user_id: cloudOwnerId, payload, revision: 1 }).select('revision').single();
        } else {
            result = await cloudClient.from('invoice_snapshots')
                .update({ payload, revision: cloudRevision + 1, updated_at: new Date().toISOString() })
                .eq('user_id', cloudOwnerId).eq('revision', cloudRevision)
                .select('revision').maybeSingle();
        }
        if (result.error) {
            if (result.error.code === '23505') {
                cloudConflict = true;
                showCloudConnection();
                setCloudStatus('Cloud đã có dữ liệu khác · Cần chọn bản', 'dirty');
                return;
            }
            throw result.error;
        }
        if (!result.data) {
            cloudConflict = true;
            showCloudConnection();
            setCloudStatus('Thiết bị khác đã thay đổi Cloud · Cần chọn bản', 'dirty');
            return;
        }
        cloudRevision = result.data.revision;
        localStorage.setItem(CLOUD_OWNER_KEY, cloudUser.id);
        cloudDirty = changeAtStart !== cloudChangeNumber;
        saveCloudMeta(cloudDirty);
        if (!cloudDirty) setCloudStatus('Đã đồng bộ Cloud');
    } catch (error) {
        setCloudStatus(`Lỗi đồng bộ: ${cloudError(error)}`, 'dirty');
    } finally {
        cloudBusy = false;
        if (cloudDirty && !cloudConflict && cloudReady && changeAtStart !== cloudChangeNumber) {
            clearTimeout(cloudSaveTimer);
            cloudSaveTimer = setTimeout(uploadSupabaseSnapshot, 1200);
        }
    }
}

async function refreshSupabaseCloud() {
    if (!cloudUser || cloudConflict || cloudBusy || !activePassphrase) return;
    if (!cloudReady) return connectCloud(cloudUser);
    try {
        const row = await fetchCloudSnapshot();
        if (!row) {
            if (cloudRole === 'accountant') {
                setCloudStatus('Chỉ xem · Admin chưa đưa dữ liệu lên Cloud');
                return;
            }
            if (cloudRevision !== null) throw new Error('Bản Cloud đã bị xóa bên ngoài ứng dụng.');
            if (cloudDirty) uploadSupabaseSnapshot();
            return;
        }
        if (row.revision === cloudRevision) {
            if (cloudRole === 'admin' && cloudDirty) uploadSupabaseSnapshot();
            else setCloudStatus(cloudRole === 'accountant' ? 'Chỉ xem · Đã cập nhật Cloud' : 'Đã đồng bộ Cloud');
            return;
        }
        if (cloudDirty) {
            cloudConflict = true;
            showCloudConnection();
            setCloudStatus('Thiết bị khác đã thay đổi Cloud · Cần chọn bản', 'dirty');
            return;
        }
        await applyCloudSnapshot(row);
    } catch (error) {
        setCloudStatus(`Chưa kiểm tra được Cloud: ${cloudError(error)}`, 'dirty');
    }
}

async function useSupabaseCloud() {
    if (!cloudUser) return;
    if (!confirm('Dùng bản Cloud mới nhất? Ứng dụng sẽ sao lưu bản trên máy rồi thay thế.')) return;
    try {
        const row = await fetchCloudSnapshot();
        if (!row) throw new Error('Cloud chưa có dữ liệu.');
        await applyCloudSnapshot(row, true);
        cloudReady = true;
        stopCloudPolling();
        cloudPollTimer = setInterval(refreshSupabaseCloud, 30000);
    } catch (error) {
        alert(`Không tải được bản Cloud: ${cloudError(error)}`);
    }
}

async function useSupabaseLocal() {
    if (!cloudUser || cloudRole !== 'admin') return;
    if (!confirm('Đưa bản trên máy lên Cloud? Ứng dụng sẽ tải bản sao lưu Cloud cũ trước khi ghi đè.')) return;
    try {
        const row = await fetchCloudSnapshot();
        if (row) {
            downloadJsonBackup(row.payload, 'kiotviet-cloud-truoc-khi-ghi-de');
            cloudRevision = row.revision;
        } else cloudRevision = null;
        cloudConflict = false;
        cloudReady = true;
        cloudDirty = true;
        showCloudConnection();
        saveCloudMeta(true);
        await uploadSupabaseSnapshot();
        stopCloudPolling();
        cloudPollTimer = setInterval(refreshSupabaseCloud, 30000);
    } catch (error) {
        cloudConflict = true;
        showCloudConnection();
        alert(`Không đưa được bản máy lên Cloud: ${cloudError(error)}`);
    }
}

window.addEventListener('online', () => {
    if (activePassphrase && !cloudUser) startSupabaseSync();
    else if (cloudReady && cloudDirty) uploadSupabaseSnapshot();
    else refreshSupabaseCloud();
});
window.addEventListener('focus', () => {
    if (activePassphrase && cloudUser) refreshSupabaseCloud();
});

applyRoleUI();
