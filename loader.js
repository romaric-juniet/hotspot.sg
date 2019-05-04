const fetch = require("node-fetch");
const fs = require("fs");

// https://www.flickr.com/services/api/flickr.photos.search.htm
// https://www.flickr.com/services/api/explore/flickr.photos.search
async function loadPhotos(page = 0) {
  const params = Object.entries({
    api_key: "407902b4e99781ae7d33552db35a119c",
    bbox: "103.63123,1.180947,104.040871,1.458106",
    extras: "date_taken,geo,url_s,views",
    min_taken_date: new Date(2018, 0, 1).getTime() / 1000,
    max_taken_date: new Date(2019, 0, 1).getTime() / 1000,
    per_page: "500",
    sort: "interestingness-desc"
  })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const flickrPhotos = await fetch(
    `https://api.flickr.com/services/rest/?method=flickr.photos.search&${params}&format=json&nojsoncallback=1`
  ).then(data => data.json());
  return {
    photos: flickrPhotos.photos.photo,
    pages: flickrPhotos.photos.pages
  };
}

(async function() {
  const { photos, pages } = await loadPhotos(0);
  const pagesToLoad = Math.min(pages, 30);
  const promises = [];

  console.log(`loading ${pagesToLoad} pages`);
  for (let i = 1; i < pagesToLoad; i++) {
    promises.push(loadPhotos(i).then(x => x.photos));
  }
  const allPhotos = photos.concat(...(await Promise.all(promises)));

  console.log(`${allPhotos.length} photos`);

  var geojsonFeatures = allPhotos.map(photo => ({
    type: "Feature",
    properties: {
      views: photo.views,
      url_s: photo.url_s,
      date_taken: photo.date_taken,
      description: photo.description
    },
    geometry: {
      type: "Point",
      coordinates: [photo.longitude, photo.latitude]
    }
  }));

  const geojson = JSON.stringify({
    type: "FeatureCollection",
    features: geojsonFeatures
  });
  fs.writeFileSync("2018.geojson", geojson);
})();
