const autoBind = require('auto-bind');
const NotFoundError = require('../../exceptions/NotFoundError');

class AlbumsHandler {
  constructor(albumsService, songsService, storageService, validator, uploadsValidator) {
    this._albumsService = albumsService;
    this._songsService = songsService;
    this._storageService = storageService;
    this._validator = validator;
    this._uploadsValidator = uploadsValidator;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;

    const albumId = await this._albumsService.addAlbum({ name, year });

    const response = h.response({
      status: 'success',
      message: 'Album berhasil ditambahkan',
      data: {
        albumId,
      },
    });
    response.code(201);

    return response;
  }

  async getAlbumsHandler() {
    const albums = await this._albumsService.getAlbums();
    return {
      status: 'success',
      data: {
        albums,
      },
    };
  }

  async getAlbumByIdHandler(request) {
    const { id } = request.params;
    const album = await this._albumsService.getAlbumById(id);

    try {
      const songs = await this._songsService.getSongsByAlbumId(id);
      album.songs = songs;
    } catch (error) {
      if (error instanceof NotFoundError) {
        album.songs = [];
      }
    }

    return {
      status: 'success',
      data: {
        album,
      },
    };
  }

  async putAlbumByIdHandler(request) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const { id } = request.params;

    await this._albumsService.editAlbumById(id, { name, year });

    return {
      status: 'success',
      message: 'Album berhasil diperbarui',
    };
  }

  async deleteAlbumByIdHandler(request) {
    const { id } = request.params;
    await this._albumsService.deleteAlbumById(id);

    return {
      status: 'success',
      message: 'Album berhasil dihapus',
    };
  }

  async postUploadAlbumCoverImageHandler(request, h) {
    const { id } = request.params;
    const { cover } = request.payload;
    this._uploadsValidator.validateImageHeaders(cover.hapi.headers);

    const filename = await this._storageService.writeFile(cover, cover.hapi);

    const fileLocation = `http://${process.env.HOST}:${process.env.PORT}/assets/album/cover/images/${filename}`;

    await this._albumsService.addAlbumCoverUrlById(id, fileLocation);

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });

    response.code(201);
    return response;
  }

  async getAlbumLikeCountHandler(request) {
    const { id } = request.params;
    const likes = await this._albumsService.getAlbumLikeCountById(id);
    return {
      status: 'success',
      data: {
        likes,
      },
    };
  }

  async postAlbumLikeByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._albumsService.getAlbumById(id);
    await this._albumsService.addAlbumLikeById(id, credentialId);

    const response = h.response({
      status: 'success',
      message: 'Success Like Album!',
    });
    response.code(201);

    return response;
  }

  async deleteAlbumLikeByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    await this._albumsService.deleteAlbumLikeById(id, credentialId);

    return {
      status: 'success',
      message: 'Success Unlike Album!',
    };
  }
}

module.exports = AlbumsHandler;
