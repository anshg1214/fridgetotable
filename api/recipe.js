const axios = require("axios");

const getRecipeOptions = async (val, id, key, cache) => {
    val = val.toLowerCase();
    cacheData = await cache.get(`recipe:${val}`);
    if (cacheData) {
        return cacheData;
    }

    const config = {
        method: "get",
        url: `https://api.edamam.com/api/recipes/v2?type=public&app_id=${id}&app_key=${key}&q=${val}`,
    };
    returnData = await axios(config);
    await cache.set(`recipe:${val}`, returnData.data, 86400000);
    return returnData.data;
};

module.exports = { getRecipeOptions };