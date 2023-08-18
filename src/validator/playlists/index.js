const InvariantError = require('../../exceptions/InvariantError');
const { PlaylistPayloadSchema } = require('./schema');
const { PlaylistSongPayloadSchema } = require('./schema');

const PlaylistsValidator = {
  validatePlaylistPayload: (payload) => {
    const validationResult = PlaylistPayloadSchema.validate(payload);
    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message);
    }
  },
  validatePlaylistSongValidator: (payload) => {
    const validationResult = PlaylistSongPayloadSchema.validate(payload);
    if (validationResult.error) {
      throw new InvariantError(PlaylistSongPayloadSchema.error.message);
    }
  },
};

module.exports = PlaylistsValidator;
