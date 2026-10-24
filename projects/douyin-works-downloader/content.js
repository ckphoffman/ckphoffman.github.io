const BASE_PARAMS = {
  device_platform: 'webapp',
  aid: '6383',
  channel: 'channel_pc_web',
  pc_client_type: '1',
  version_code: '170400',
  version_name: '17.4.0',
  update_version_code: '170400',
  cookie_enabled: 'true',
  platform: 'PC',
};

async function apiFetch(path, extra = {}) {
  const params = new URLSearchParams({ ...BASE_PARAMS, ...extra });
  const resp = await fetch(`${path}?${params}`, { credentials: 'include' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function getSelfSecUserId() {
  const data = await apiFetch('/aweme/v1/web/user/profile/self/');
  const uid = data.user?.sec_uid;
  if (!uid) throw new Error('未找到用户ID，请确保已登录抖音');
  return uid;
}

function parsePost(v, isPrivate) {
  const id = v.aweme_id;
  const desc = v.desc?.trim() || `作品_${id}`;
  const isImagePost = v.aweme_type === 68 || (v.images && v.images.length > 0);

  if (isImagePost) {
    const images = (v.images || []).map((img, i) => ({
      url: img.watermark_free_download_url_list?.[0] || img.download_url_list?.[0] || img.url_list?.[0],
      index: i + 1,
    })).filter(img => img.url);
    if (!images.length) return null;
    return { id, desc, is_private: isPrivate, create_time: v.create_time, type: 'image', images };
  }

  const url = v.video?.play_addr?.url_list?.[0];
  if (!url) return null;
  return { id, desc, is_private: isPrivate, create_time: v.create_time, type: 'video', url };
}

async function fetchPage(path, extra, isPrivate, onProgress, accum) {
  let maxCursor = 0;
  let hasMore = true;
  while (hasMore) {
    const data = await apiFetch(path, { ...extra, max_cursor: maxCursor, count: '18' });
    if (data.status_code !== 0) throw new Error(`API 错误: ${data.status_msg}`);
    for (const v of (data.aweme_list || [])) {
      const post = parsePost(v, isPrivate);
      if (post) accum.push(post);
    }
    onProgress();
    hasMore = data.has_more === 1;
    maxCursor = data.max_cursor;
    if (hasMore) await new Promise(r => setTimeout(r, 600));
  }
}

async function fetchAllPosts(onProgress) {
  const secUserId = await getSelfSecUserId();
  const all = [];
  await fetchPage('/aweme/v1/web/aweme/post/',
    { sec_user_id: secUserId, publish_video_strategy_type: '2' }, false, onProgress, all);
  await fetchPage('/aweme/v1/web/private/aweme/', {}, true, onProgress, all);
  return all;
}

function safeName(str) {
  return (str || '').replace(/[/\\:*?"<>|\n\r]/g, '_').slice(0, 50);
}

// ── 消息处理 ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FETCH_POSTS') {
    fetchAllPosts(() => chrome.runtime.sendMessage({ type: 'FETCH_PROGRESS' }))
      .then(posts => sendResponse({ ok: true, posts }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'DOWNLOAD_POSTS') {
    const { posts } = msg;

    // 立即触发媒体文件下载
    for (const post of posts) {
      const tag = post.is_private ? '[私密]' : '';
      const folder = `抖音作品/${tag}${safeName(post.desc)}_${post.id}`;
      if (post.type === 'video') {
        chrome.runtime.sendMessage({ type: 'EXECUTE_DOWNLOAD', url: post.url, filename: `${folder}.mp4` });
      } else {
        post.images.forEach(img => {
          chrome.runtime.sendMessage({ type: 'EXECUTE_DOWNLOAD', url: img.url, filename: `${folder}_${img.index}.jpg` });
        });
      }
    }

    sendResponse({ ok: true });
    return true;
  }
});
