exports.up = (pgm) => {
  pgm.createTable('playlists_songs', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    playlist_id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    song_id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    created_at: {
      type: 'TEXT',
      notNull: true,
    },
    updated_at: {
      type: 'TEXT',
      notNull: true,
    },
  });

  pgm.addConstraint('playlists_songs', 'unique_playlist_id_and_song_id', 'UNIQUE(playlist_id, song_id)');

  pgm.addConstraint('playlists_songs', 'fk_playlists_songs.playlists.id', 'FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE');

  pgm.addConstraint('playlists_songs', 'fk_playlists_songs.songs.id', 'FOREIGN KEY(song_id) REFERENCES songs(id) ON DELETE CASCADE');
};

exports.down = (pgm) => {
  pgm.dropConstraint('playlists_songs', 'fk_playlists_songs.playlists.id');

  pgm.dropConstraint('playlists_songs', 'fk_playlists_songs.songs.id');

  pgm.dropTable('playlists_songs');
};
