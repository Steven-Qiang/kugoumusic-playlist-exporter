<template>
  <div class="playlist-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="header-left">
            <h2>我的歌单</h2>
            <a href="https://github.com/Steven-Qiang/kugou-exporter" target="_blank" class="github-link">
              Steven-Qiang/kugou-exporter@{{ version }}
            </a>
          </div>
          <div v-if="userInfo" class="user-info">
            <el-avatar :src="replaceImageSize(userInfo.pic, 100)" :size="32" />
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
                class="playlist-item"
                :class="[{ active: selectedPlaylist?.listid === item.listid }]"
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
              <el-button type="primary" @click="exportDialogRef?.open(songs, selectedPlaylist.name)">
                导出歌单
              </el-button>
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

    <export-dialog ref="exportDialogRef" />
    <song-url-dialog ref="songUrlDialogRef" />
  </div>
</template>

<script setup lang="ts">
import type { Playlist, PlaylistData, Song, SongListData } from '@/types';
import { SwitchButton } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import ExportDialog from '@/components/ExportDialog.vue';
import SongUrlDialog from '@/components/SongUrlDialog.vue';
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
const exportDialogRef = useTemplateRef('exportDialogRef');
const songUrlDialogRef = useTemplateRef('songUrlDialogRef');

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
        params: { listid: playlist.listid, page: currentPage, pagesize: 100 },
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

function getSongUrl(song: Song) {
  songUrlDialogRef.value?.open(song, selectedPlaylist.value?.name || '');
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: number) {
  return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm');
}

function handleLogout() {
  router.push('/login');
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
</style>
