const mapDBToModel = ({
  id,
  name,
  year,
  url_cover,
}) => ({
  id,
  name,
  year,
  coverUrl: url_cover,
});

module.exports = { mapDBToModel };
