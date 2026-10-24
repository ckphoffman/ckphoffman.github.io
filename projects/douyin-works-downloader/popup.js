let allPosts = [];
let activeTabId = null;

const $ = id => document.getElementById(id);

function showScreen(name) {
  ['idle', 'loading', 'list', 'error'].forEach(s => {
    $(`screen-${s}`).classList.toggle('hidden', s !== name);
  });
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString('zh-CN');
}

function renderList(posts) {
  const list = $('video-list');
  list.innerHTML = '';
  posts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'video-item';
    const typeLabel = p.type === 'image' ? `图文 ${p.images.length}张` : '视频';
    item.innerHTML = `
      <input type="checkbox" checked data-id="${p.id}">
      <div class="video-info">
        <div class="video-desc" title="${p.desc}">${p.desc || '(无描述)'}</div>
        <div class="video-meta">
          <span class="badge ${p.is_private ? 'badge-private' : 'badge-public'}">
            ${p.is_private ? '私密' : '公开'}
          </span>
          <span class="badge badge-type">${typeLabel}</span>
          ${p.create_time ? `<span style="font-size:11px;color:#999">${formatTime(p.create_time)}</span>` : ''}
        </div>
      </div>`;
    item.querySelector('input').addEventListener('change', updateSummary);
    item.addEventListener('click', e => {
      if (e.target.tagName !== 'INPUT') {
        const cb = item.querySelector('input');
        cb.checked = !cb.checked;
        updateSummary();
      }
    });
    list.appendChild(item);
  });
}

function getSelected() {
  return allPosts.filter(p =>
    document.querySelector(`input[data-id="${p.id}"]`)?.checked
  );
}

function updateSummary() {
  const sel = getSelected();
  const priv = allPosts.filter(p => p.is_private).length;
  const imgs = allPosts.filter(p => p.type === 'image').length;
  $('summary').textContent =
    `共 ${allPosts.length} 个作品（私密 ${priv}，图文 ${imgs}），已选 ${sel.length}`;
  $('btn-download').disabled = sel.length === 0;
}

async function fetchPosts() {
  showScreen('loading');
  $('loading-text').textContent = '正在获取作品列表…';
  let count = 0;

  const onMsg = msg => {
    if (msg.type === 'FETCH_PROGRESS') {
      count++;
      $('loading-text').textContent = `已获取第 ${count} 批…`;
    }
  };
  chrome.runtime.onMessage.addListener(onMsg);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('douyin.com')) {
      throw new Error('请先打开 douyin.com 并登录');
    }
    activeTabId = tab.id;
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'FETCH_POSTS' });
    if (!resp?.ok) throw new Error(resp?.error || '获取失败');

    allPosts = resp.posts;
    renderList(allPosts);
    updateSummary();
    showScreen('list');
  } catch (e) {
    $('error-msg').textContent = e.message;
    showScreen('error');
  } finally {
    chrome.runtime.onMessage.removeListener(onMsg);
  }
}

async function fetchCommentsInMainWorld(tabId, awemeId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [awemeId],
    func: async (awemeId) => {
      const BASE = {
        device_platform: 'webapp', aid: '6383', channel: 'channel_pc_web',
        pc_client_type: '1', version_code: '170400', version_name: '17.4.0',
        update_version_code: '170400', cookie_enabled: 'true', platform: 'PC',
      };
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const parseOne = c => ({
        id: c.cid, text: c.text,
        user: c.user?.nickname, uid: c.user?.uid,
        like_count: c.digg_count, reply_count: c.reply_comment_total,
        create_time: c.create_time,
      });
      async function getJson(path, extra) {
        const p = new URLSearchParams({ ...BASE, ...extra });
        const r = await fetch(path + '?' + p, { credentials: 'include' });
        const txt = await r.text();
        if (!txt) throw new Error('空响应 (可能未登录或被限流)');
        const data = JSON.parse(txt);
        if (data.status_code !== 0) throw new Error('API错误: ' + data.status_msg);
        return data;
      }
      async function fetchReplies(commentId) {
        const out = [];
        let cursor = 0, hasMore = true;
        while (hasMore) {
          const data = await getJson('/aweme/v1/web/comment/list/reply/', {
            item_id: awemeId, comment_id: commentId,
            cursor: String(cursor), count: '20',
          });
          for (const c of (data.comments || [])) out.push(parseOne(c));
          hasMore = data.has_more === 1;
          cursor = data.cursor;
          if (hasMore) await sleep(400);
        }
        return out;
      }

      const comments = [];
      let cursor = 0, hasMore = true;
      try {
        while (hasMore) {
          const data = await getJson('/aweme/v1/web/comment/list/', {
            aweme_id: awemeId, cursor: String(cursor), count: '20',
          });
          for (const c of (data.comments || [])) comments.push(parseOne(c));
          hasMore = data.has_more === 1;
          cursor = data.cursor;
          if (hasMore) await sleep(500);
        }
        for (const c of comments) {
          if (c.reply_count > 0) {
            c.replies = await fetchReplies(c.id);
            await sleep(300);
          }
        }
        return { ok: true, comments };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
  });
  return result;
}

async function exportComments() {
  const selected = getSelected();
  if (!selected.length) {
    alert('请先选择作品');
    return;
  }
  const btn = $('btn-export-comments');
  btn.disabled = true;

  const results = [];
  try {
    for (let i = 0; i < selected.length; i++) {
      const post = selected[i];
      btn.textContent = `获取评论 (${i + 1}/${selected.length})…`;
      const resp = await fetchCommentsInMainWorld(activeTabId, post.id);
      if (!resp?.ok) throw new Error(resp?.error || '获取评论失败');
      results.push({ id: post.id, desc: post.desc, comments: resp.comments });
    }

    const json = JSON.stringify(results, null, 2);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    await chrome.downloads.download({ url: dataUrl, filename: '抖音评论.json', saveAs: false });

    const total = results.reduce((s, r) => s + r.comments.length, 0);
    btn.textContent = `已导出 ${total} 条 ✓`;
    setTimeout(() => { btn.textContent = '导出评论'; btn.disabled = false; }, 2500);
  } catch (e) {
    console.error('[导出评论失败]', e);
    btn.textContent = '失败（右键检查→控制台）';
    btn.disabled = false;
  }
}

async function downloadSelected() {
  const selected = getSelected();
  if (!selected.length || !activeTabId) return;

  $('btn-download').disabled = true;
  $('btn-download').textContent = '下载中…';

  try {
    await chrome.tabs.sendMessage(activeTabId, { type: 'DOWNLOAD_POSTS', posts: selected });
    $('btn-download').textContent = '已触发下载 ✓';
    setTimeout(() => {
      $('btn-download').textContent = '下载所选';
      $('btn-download').disabled = false;
    }, 2000);
  } catch (e) {
    $('btn-download').textContent = '失败：' + e.message;
    $('btn-download').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('btn-fetch').addEventListener('click', fetchPosts);
  $('btn-retry').addEventListener('click', fetchPosts);

  $('btn-select-all').addEventListener('click', () => {
    const cbs = document.querySelectorAll('#video-list input[type=checkbox]');
    const allChecked = [...cbs].every(cb => cb.checked);
    cbs.forEach(cb => { cb.checked = !allChecked; });
    $('btn-select-all').textContent = allChecked ? '全选' : '取消全选';
    updateSummary();
  });

  $('btn-download').addEventListener('click', downloadSelected);
  $('btn-export-comments').addEventListener('click', exportComments);
});
