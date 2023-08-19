const AlbumsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'albums',
  version: '1.0.0',
  register: async (server, {
    albumsService, songsService, storageService, validator, uploadsValidator,
  }) => {
    const albumsHandler = new AlbumsHandler(albumsService,
      songsService,
      storageService,
      validator,
      uploadsValidator);
    server.route(routes(albumsHandler));
  },
};
