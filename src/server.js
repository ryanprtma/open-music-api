require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

const albums = require('./api/albums');
const AlbumsService = require('./services/albums/AlbumsService');
const AlbumsValidator = require('./validator/albums');

const songs = require('./api/songs');
const SongsService = require('./services/songs/SongsService');
const SongsValidator = require('./validator/songs');

const users = require('./api/users');
const UsersService = require('./services/users/UsersService');
const UsersValidator = require('./validator/users');

const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/authentication/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

const playlists = require('./api/playlists');
const PlaylistsService = require('./services/playlists/PlaylistsService');
const PlaylistsValidator = require('./validator/playlists');

const collaborations = require('./api/collaborations');
const CollaborationsService = require('./services/collaborations/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');

const ActivitiesService = require('./services/activities/activitiesService');

const ClientError = require('./exceptions/ClientError');

const init = async () => {
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();

  const activitiesService = new ActivitiesService();
  const collaborationsService = new CollaborationsService(usersService);
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const playlistsService = new PlaylistsService(
    collaborationsService, activitiesService, songsService,
  );

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  server.auth.strategy('musicapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register({
    plugin: albums,
    options: {
      albumsService,
      songsService,
      validator: AlbumsValidator,
    },
  });

  await server.register({
    plugin: songs,
    options: {
      service: songsService,
      validator: SongsValidator,
    },
  });

  await server.register({
    plugin: playlists,
    options: {
      playlistsService,
      validator: PlaylistsValidator,
    },
  });

  await server.register({
    plugin: users,
    options: {
      service: usersService,
      validator: UsersValidator,
    },
  });

  await server.register({
    plugin: authentications,
    options: {
      authenticationsService,
      usersService,
      tokenManager: TokenManager,
      validator: AuthenticationsValidator,
    },
  });

  await server.register({
    plugin: collaborations,
    options: {
      collaborationsService,
      playlistsService,
      validator: CollaborationsValidator,
    },
  });

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;
    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      if (!response.isServer) {
        return h.continue;
      }
      const newResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami',
      });
      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
