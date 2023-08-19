exports.up = (pgm) => {
  pgm.addColumn('albums', {
    url_cover: {
      type: 'VARCHAR',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('albums', 'url_cover');
};
