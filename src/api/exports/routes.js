const routes = (handler) => [
  {
    method: 'POST',
    path: '/export/playlists/{id}',
    handler: handler.postExportPlaylistByIdHandler,
    options: {
      auth: 'musicapp_jwt',
    },
  },
];

module.exports = routes;
