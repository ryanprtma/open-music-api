const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const { number } = require('joi');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBToModel } = require('../../utils/albums');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, year, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbums() {
    const result = await this._pool.query('SELECT * FROM albums');
    return result.rows.map(mapDBToModel);
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    return result.rows.map(mapDBToModel)[0];
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async addAlbumCoverUrlById(id, url_cover) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET url_cover = $1, updated_at = $2 WHERE id = $3 RETURNING id, url_cover',
      values: [url_cover, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].url_cover) {
      throw new InvariantError('Cover album gagal ditambahkan');
    }

    return result.rows[0].url_cover;
  }

  async getAlbumLikeCountById(id) {
    try {
      const result = await this._cacheService.get(`album-likes:${id}`);
      return { isCached: true, data: JSON.parse(result) };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(*) AS like_count FROM user_album_likes WHERE album_id = $1',
        values: [id],
      };
      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError('Album tidak ditemukan');
      }

      await this._cacheService.set(`album-likes:${id}`, JSON.stringify(parseInt(result.rows[0].like_count, number)));

      return { isCached: false, data: parseInt(result.rows[0].like_count, number) };
    }
  }

  async addAlbumLikeById(albumId, userId) {
    await this.verifyAlbumLike(albumId, userId);

    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, userId, albumId, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menyukai album');
    }

    await this._cacheService.delete(`album-likes:${albumId}`);

    return result.rows[0].id;
  }

  async deleteAlbumLikeById(albumId, userId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 and album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Gagal batal menyukai album. Id tidak ditemukan');
    }

    await this._cacheService.delete(`album-likes:${albumId}`);

    return result.rows[0].id;
  }

  async verifyAlbumLike(albumId, userId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE user_id = $1 and album_id = $2',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);

    if (result.rows.length > 0) {
      throw new InvariantError('User Tidak Boleh Meyukai Album Lebih Dari Satu Kali!');
    }
  }
}

module.exports = AlbumsService;
