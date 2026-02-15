<template>
  <div class="playlist-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="header-left">
            <h2>我的歌单</h2>
            <a href="https://github.com/Steven-Qiang/kugoumusic-playlist-exporter" target="_blank" class="github-link">Steven-Qiang/kugoumusic-playlist-exporter@{{ version }}</a>
          </div>
          <div class="user-info">
            <el-avatar v-if="userInfo?.pic" :src="replaceImageSize(userInfo.pic, 100)" :size="32" />
            <span>{{ userInfo?.nickname }}</span>
            <el-button type="danger" size="small" :icon="SwitchButton" @click="handleLogout" />
          </div>
        </div>
      </el-header>
      <el-container>
        <el-aside width="300px">
          <div class="aside-content">
            <el-input v-model="searchText" placeholder="搜索歌单" clearable class="search-input" />
            <div v-loading="loading" class="playlist-list">
              <div
                v-for="item in filteredPlaylists"
                :key="item.listid"
                class="playlist-item" :class="[{ active: selectedPlaylist?.listid === item.listid }]"
                @click="selectPlaylist(item)"
              >
                <el-image :src="replaceImageSize(item.pic || item.create_user_pic, 100)" class="playlist-pic" />
                <div class="playlist-info">
                  <div class="playlist-name">
                    {{ item.name }}
                  </div>
                  <div class="playlist-count">
                    {{ item.count }} 首
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-aside>
        <el-main>
          <div v-if="selectedPlaylist" v-loading="loadingSongs" class="playlist-detail">
            <div class="detail-header">
              <h3>{{ selectedPlaylist.name }}</h3>
              <div class="export-buttons">
                <el-button type="success" @click="handleExport(true)">
                  导出原始 JSON
                </el-button>
                <el-button type="primary" @click="handleExport(false)">
                  导出为 XiaoMusic 格式
                </el-button>
              </div>
            </div>
            <div class="table-container">
              <el-table :data="songs">
                <el-table-column type="index" label="#" width="50" />
                <el-table-column label="封面" width="70">
                  <template #default="{ row }">
                    <el-image :src="replaceImageSize(row.cover, 120)" class="song-pic" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="歌曲" sortable />
                <el-table-column prop="albuminfo.name" label="专辑" width="150" sortable />
                <el-table-column prop="collecttime" label="收藏时间" width="180" sortable>
                  <template #default="{ row }">
                    {{ formatTime(row.collecttime) }}
                  </template>
                </el-table-column>
                <el-table-column prop="timelen" label="时长" width="100" sortable>
                  <template #default="{ row }">
                    {{ formatDuration(row.timelen) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120" align="center">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" link @click="getSongUrl(row)">
                      获取链接
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          <el-empty v-else description="请选择歌单" />
        </el-main>
      </el-container>
    </el-container>

    <el-dialog v-model="rawExportDialogVisible" title="导出原始 JSON" width="500px">
      <div class="raw-export-content">
        <p>是否需要获取音频链接？</p>
        <div class="raw-export-info">
          <div class="info-item">
            <strong>获取链接：</strong>
            <ul>
              <li>会在原始数据中包含音频播放链接</li>
              <li>需要耗费较长时间逐个获取</li>
              <li>链接可能有时效性限制</li>
            </ul>
          </div>
          <div class="info-item">
            <strong>不获取链接：</strong>
            <ul>
              <li>只导出歌曲元数据（歌名、专辑、时长等）</li>
              <li>导出速度快</li>
              <li>适合备份歌单信息</li>
            </ul>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="rawExportDialogVisible = false">
          取消
        </el-button>
        <el-button type="info" @click="handleRawExportWithoutUrl">
          不获取链接
        </el-button>
        <el-button type="primary" @click="handleRawExportWithUrl">
          获取链接
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="exportDialogVisible" :title="exportProgress === 100 ? '导出结果' : '导出进度'" :close-on-click-modal="false" :close-on-press-escape="false" width="600px">
      <el-progress v-if="exportProgress < 100" :percentage="exportProgress" :stroke-width="20" />
      <div v-if="exportProgress < 100" class="export-info">
        <div class="export-status">
          {{ exportStatus }}
        </div>
        <div v-if="exportDetail.totalSongs > 0" class="export-detail">
          <div>总歌曲数: {{ exportDetail.totalSongs }}</div>
          <div v-if="exportDetail.currentSong">
            当前: {{ exportDetail.currentSong }}
          </div>
          <div v-if="exportDetail.fetchedCount > 0">
            已获取: {{ exportDetail.fetchedCount }}/{{ exportDetail.totalSongs }}
          </div>
          <div v-if="exportDetail.successCount > 0" class="success-count">
            成功: {{ exportDetail.successCount }}
          </div>
          <div v-if="exportDetail.failedCount > 0" class="failed-count">
            失败: {{ exportDetail.failedCount }}
          </div>
        </div>
      </div>
      <div v-if="exportDetail.failedSongs.length > 0" class="failed-songs">
        <div class="failed-songs-title">
          失败歌曲列表:
        </div>
        <div v-for="(song, index) in exportDetail.failedSongs" :key="index" class="failed-song-item">
          {{ index + 1 }}. {{ song }}
        </div>
      </div>
      <div v-if="exportProgress === 100 && exportedJson" class="export-result">
        <el-input v-model="exportedJson" type="textarea" :rows="15" readonly />
        <div class="export-actions">
          <el-button type="primary" @click="copyJson">
            复制
          </el-button>
          <el-button type="success" @click="downloadJson">
            下载
          </el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="urlDialogVisible" title="歌曲链接" width="650px">
      <div v-if="urlDialogError" class="url-error">
        {{ urlDialogError }}
      </div>
      <div v-else-if="currentSongUrls.length > 0" class="url-list">
        <div v-for="(url, index) in currentSongUrls" :key="index" class="url-item">
          <span class="url-label">链接 {{ index + 1 }}</span>
          <el-input v-model="currentSongUrls[index]" readonly>
            <template #append>
              <el-button type="primary" @click="copyUrl(url)">
                复制
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
      <div v-else class="url-loading">
        加载中...
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Playlist, PlaylistData, Song, SongListData, SongUrl, XiaomusicPlaylist, XiaomusicSong } from '@/types';
import { SwitchButton } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { getCachedUserInfo } from '@/router';
import { replaceImageSize } from '@/utils/image';
import request from '@/utils/request';
import packageJson from '../../../../package.json';

const version = packageJson.version;
const router = useRouter();

const userInfo = ref<any>(null);
const loading = ref(false);
const loadingSongs = ref(false);
const searchText = ref('');
const playlists = ref<Playlist[]>([]);
const selectedPlaylist = ref<Playlist | null>(null);
const songs = ref<Song[]>([]);
const exportDialogVisible = ref(false);
const exportProgress = ref(0);
const exportStatus = ref('');
const exportDetail = ref({
  totalSongs: 0,
  fetchedCount: 0,
  currentSong: '',
  successCount: 0,
  failedCount: 0,
  failedSongs: [] as string[]
});
const urlDialogVisible = ref(false);
const currentSongUrls = ref<string[]>([]);
const urlDialogError = ref('');
const exportedJson = ref('');
const rawExportDialogVisible = ref(false);

const filteredPlaylists = computed(() => {
  if (!searchText.value) return playlists.value;
  return playlists.value.filter((p) => p.name.includes(searchText.value));
});

async function fetchPlaylists() {
  loading.value = true;
  try {
    userInfo.value = getCachedUserInfo();
    const res = await request.get<PlaylistData>('/user/playlist');
    playlists.value = res.data.info || [];
    const favorite = playlists.value.find((p) => p.name === '我喜欢');
    if (favorite) {
      selectPlaylist(favorite);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function selectPlaylist(playlist: Playlist) {
  selectedPlaylist.value = playlist;
  songs.value = [];
  loadingSongs.value = true;

  try {
    const allSongs: Song[] = [];
    let currentPage = 1;
    let totalCount = 0;

    while (true) {
      const res = await request.get<SongListData>('/playlist/track/all/new', {
        params: { listid: playlist.listid, page: currentPage, pagesize: 100 }
      });
      allSongs.push(...(res.data.info || []));
      totalCount = res.data.count;
      if (allSongs.length >= totalCount) break;
      currentPage++;
    }

    songs.value = [...allSongs].sort((a, b) => a.fsort - b.fsort);
  } catch (error) {
    console.error(error);
  } finally {
    loadingSongs.value = false;
  }
}

async function fetchSongUrl(hash: string, audioId: number): Promise<string[]> {
  const cacheKey = `song_url_${hash}_${audioId}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    const { urls, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 3600000) {
      return urls;
    }
  }

  const urlRes = await request.get<SongUrl>('/song/url', {
    params: { hash, album_audio_id: audioId }
  });
  const urls = urlRes.data?.url || [];
  if (urls.length > 0) {
    sessionStorage.setItem(cacheKey, JSON.stringify({ urls, timestamp: Date.now() }));
  }
  return urls;
}

async function handleExport(isRaw: boolean) {
  if (!selectedPlaylist.value || songs.value.length === 0) return;

  if (isRaw) {
    rawExportDialogVisible.value = true;
    return;
  }

  await doExport(false, true);
}

async function doExport(isRaw: boolean, fetchUrls: boolean) {
  const sortedSongs = [...songs.value].sort((a, b) => a.fsort - b.fsort);

  if (!fetchUrls) {
    const json = JSON.stringify(sortedSongs, null, 2);
    exportedJson.value = json;
    exportDialogVisible.value = true;
    exportProgress.value = 100;
    exportStatus.value = '导出完成！';
    exportDetail.value = { totalSongs: sortedSongs.length, fetchedCount: sortedSongs.length, currentSong: '', successCount: sortedSongs.length, failedCount: 0, failedSongs: [] };
    ElMessage.success(`导出成功！共 ${sortedSongs.length} 首歌曲`);
    return;
  }

  exportDialogVisible.value = true;
  exportProgress.value = 0;
  exportStatus.value = '正在注册设备...';
  exportDetail.value = { totalSongs: sortedSongs.length, fetchedCount: 0, currentSong: '', successCount: 0, failedCount: 0, failedSongs: [] };

  try {
    await request.get('/register/dev');

    exportStatus.value = '正在获取歌曲地址...';
    const xiaomusicSongs: XiaomusicSong[] = [];

    for (let i = 0; i < sortedSongs.length; i++) {
      const song = sortedSongs[i];
      exportDetail.value.currentSong = song.name;
      exportDetail.value.fetchedCount = i + 1;

      try {
        const urls = await fetchSongUrl(song.hash, song.audio_id);
        const url = urls[0];

        if (!url) {
          exportDetail.value.failedCount++;
          exportDetail.value.failedSongs.push(song.name);
        } else {
          exportDetail.value.successCount++;
        }

        if (!isRaw) {
          xiaomusicSongs.push({
            name: song.name,
            url: url || ''
          });
        }
      } catch (error) {
        console.error(`获取歌曲 ${song.name} 地址失败`, error);
        exportDetail.value.failedCount++;
        exportDetail.value.failedSongs.push(song.name);
        if (!isRaw) {
          xiaomusicSongs.push({
            name: song.name,
            url: ''
          });
        }
      }
      exportProgress.value = Math.floor(((i + 1) / sortedSongs.length) * 100);
      exportStatus.value = `正在获取歌曲地址 ${i + 1}/${sortedSongs.length} (成功: ${exportDetail.value.successCount}, 失败: ${exportDetail.value.failedCount})`;
    }

    exportStatus.value = '正在生成文件...';

    let json: string;

    if (isRaw) {
      json = JSON.stringify(sortedSongs, null, 2);
    } else {
      const xiaomusicData: XiaomusicPlaylist[] = [{
        name: selectedPlaylist.value!.name,
        musics: xiaomusicSongs
      }];
      json = JSON.stringify(xiaomusicData, null, 2);
    }

    exportStatus.value = '导出完成！';
    exportProgress.value = 100;
    exportedJson.value = json;
    if (exportDetail.value.failedCount > 0) {
      ElMessage.warning(`导出完成！成功: ${exportDetail.value.successCount}, 失败: ${exportDetail.value.failedCount}`);
    } else {
      ElMessage.success(`导出成功！共 ${exportDetail.value.successCount} 首歌曲`);
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('导出失败');
  }
}

function handleRawExportWithUrl() {
  rawExportDialogVisible.value = false;
  doExport(true, true);
}

function handleRawExportWithoutUrl() {
  rawExportDialogVisible.value = false;
  doExport(true, false);
}

function copyJson() {
  navigator.clipboard.writeText(exportedJson.value).then(() => {
    ElMessage.success('JSON已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
}

function downloadJson() {
  const blob = new Blob([exportedJson.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = selectedPlaylist.value ? `${selectedPlaylist.value.name}.json` : 'export.json';
  a.click();
  ElMessage.success('下载成功');
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function handleLogout() {
  router.push('/login');
}

async function getSongUrl(song: Song) {
  urlDialogVisible.value = true;
  currentSongUrls.value = [];
  urlDialogError.value = '';

  try {
    await request.get('/register/dev');
    const urls = await fetchSongUrl(song.hash, song.audio_id);
    if (urls.length > 0) {
      currentSongUrls.value = urls;
    } else {
      urlDialogError.value = '该歌曲没有可用链接';
    }
  } catch (error) {
    console.error(error);
    urlDialogError.value = `获取链接失败: ${error}`;
  }
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('链接已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
}

onMounted(() => {
  fetchPlaylists();
});
</script>

<style scoped>
.playlist-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.el-container {
  flex: 1;
  overflow: hidden;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.github-link {
  font-size: 13px;
  color: #409eff;
  text-decoration: none;
}

.github-link:hover {
  text-decoration: underline;
}

.el-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.el-aside {
  background: #f5f7fa;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.aside-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
}

.search-input {
  margin-bottom: 10px;
  flex-shrink: 0;
}

.playlist-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 5px;
}

.playlist-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
}

.playlist-item:hover {
  background: #ecf5ff;
}

.playlist-item.active {
  background: #409eff;
  color: #fff;
}

.playlist-info {
  flex: 1;
  overflow: hidden;
}

.playlist-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-count {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
}

.export-buttons {
  display: flex;
  gap: 10px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-header h3 {
  margin: 0;
}

.song-pic {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

.playlist-pic {
  width: 50px;
  height: 50px;
  border-radius: 4px;
}

.table-container {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.export-info {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.export-status {
  margin-bottom: 10px;
  font-weight: 500;
  color: #303133;
}

.export-detail {
  font-size: 14px;
  color: #606266;
}

.success-count {
  color: #67c23a;
}

.failed-count {
  color: #f56c6c;
}

.failed-songs {
  margin-top: 15px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  background: #fef0f0;
  border-radius: 4px;
  border: 1px solid #fde2e2;
}

.failed-songs-title {
  font-weight: 500;
  color: #f56c6c;
  margin-bottom: 8px;
}

.failed-song-item {
  font-size: 13px;
  color: #606266;
  padding: 2px 0;
}

.url-error {
  padding: 15px;
  background: #fef0f0;
  border-radius: 4px;
  border: 1px solid #fde2e2;
  color: #f56c6c;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.url-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.url-label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  min-width: 60px;
  text-align: right;
}

.url-loading {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.export-result {
  margin-top: 20px;
}

.export-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.raw-export-content {
  padding: 10px 0;
}

.raw-export-content > p {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 15px;
  color: #303133;
}

.raw-export-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.info-item strong {
  display: block;
  margin-bottom: 8px;
  color: #409eff;
}

.info-item ul {
  margin: 0;
  padding-left: 20px;
}

.info-item li {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
}
</style>
