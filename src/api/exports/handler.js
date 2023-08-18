const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(service, playlistsService, validator) {
    this._service = service;
    this._playlistsService = playlistsService;
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistByIdHandler(request, h) {
    this._validator.validateExportPlaylistPayload(request.payload);

    const { id } = request.params;
    await this._playlistsService.getPlaylistById(id);
    await this._playlistsService.verifyPlaylistAccess(id, request.auth.credentials.id);
    const message = {
      userId: request.auth.credentials.id,
      playListId: id,
      targetEmail: request.payload.targetEmail,
    };

    await this._service.sendMessage(`export:playlist-${id}`, JSON.stringify(message));

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
