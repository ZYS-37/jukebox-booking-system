function uploadHumidifierPhoto(req, res) {
  return res.status(410).json({
    message: 'Humidifier photo uploads are temporarily unavailable.'
  })
}

function buildHumidifierPhotoUrl() {
  return null
}

function deleteUploadedFile() {}

module.exports = {
  uploadHumidifierPhoto,
  buildHumidifierPhotoUrl,
  deleteUploadedFile
}
