const axios = require("axios");

const getFoodInfo = async (val, id, key, cache) => {
    val = val.toLowerCase();
    cacheData = await cache.get(`food:${val}`);
    if (cacheData) {
        return cacheData;
    }

    const config = {
        method: "get",
        url: `https://api.edamam.com/api/food-database/v2/parser?app_id=${id}&app_key=${key}&ingr=${val}&nutrition-type=cooking`,
    };
    returnData = await axios(config);
    await cache.set(`food:${val}`, returnData.data, 86400000);
    return returnData.data;
};

module.exports = { getFoodInfo };