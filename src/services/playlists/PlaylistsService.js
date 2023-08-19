const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBToModel } = require('../../utils/playlists');
const { mapDBToResponse } = require('../../utils/songs');

class PlaylistsService {
  constructor(collaborationService, activitiesService, songsService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._activitiesService = activitiesService;
    this._songsService = songsService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, owner, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists({ owner }) {
    const query = {
      text: `SELECT playlists.*, users.username
      FROM playlists
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      LEFT JOIN users ON users.id = playlists.owner
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };

    const result = await this._pool.query(query);
    return result.rows.map(mapDBToModel);
  }

  async getPlaylistById(id) {
    const query = {
      text: `SELECT playlists.*, users.username
      FROM playlists
      LEFT JOIN users ON users.id = playlists.owner
      WHERE playlists.id = $1`,
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError(`Playlist dengan id: ${id} tidak dtiemukan`);
    }

    return result.rows.map(mapDBToModel)[0];
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async addSongToPlaylist(playlistId, songId) {
    await this.verifyNewPlaylistSong(playlistId, songId);
    const id = `playlist-song-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO playlists_songs VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, playlistId, songId, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menambahkan lagu ke playlist');
    }

    return result.rows[0].id;
  }

  async getPlaylistSongs(id) {
    const query = {
      text: `SELECT songs.*
      FROM songs LEFT JOIN playlists_songs ON playlists_songs.song_id = songs.id
      WHERE playlists_songs.playlist_id  = $1`,
      values: [id],
    };

    const result = await this._pool.query(query);
    return result.rows.map(mapDBToResponse);
  }

  async verifyNewPlaylistSong(playlistId, songId) {
    const query = {
      text: 'SELECT id FROM playlists_songs WHERE playlist_id = $1 and song_id = $2',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (result.rows.length > 0) {
      throw new InvariantError('Gagal menambahkan lagu ke playlist. Lagu telah ada di dalam playlist.');
    }
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlists_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menghapus lagu dari playlist');
    }

    return result.rows[0].id;
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async addActivities(playlistId, songId, userId, action) {
    await this._activitiesService.addActivities(playlistId, songId, userId, action);
  }

  async getActivities(playlistId) {
    const result = await this._activitiesService.getActivities(playlistId);

    if (!result.length) {
      throw new NotFoundError('Aktivitas tidak ditemukan');
    }

    return result;
  }

  async isValidSong(songId) {
    try {
      await this._songsService.getSongById(songId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
