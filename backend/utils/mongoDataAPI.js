// Alternative MongoDB connection using Data API
// Use this if direct connection fails

const axios = require('axios');

const MONGODB_DATA_API_URL = 'https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1';
const API_KEY = process.env.MONGODB_DATA_API_KEY;

class MongoDataAPI {
  constructor() {
    this.baseURL = MONGODB_DATA_API_URL;
    this.headers = {
      'Content-Type': 'application/json',
      'api-key': API_KEY
    };
  }

  async findOne(collection, filter) {
    try {
      const response = await axios.post(`${this.baseURL}/action/findOne`, {
        collection: collection,
        database: 'chatsync',
        filter: filter
      }, { headers: this.headers });
      
      return response.data.document;
    } catch (error) {
      console.error('MongoDB Data API findOne error:', error.message);
      throw error;
    }
  }

  async insertOne(collection, document) {
    try {
      const response = await axios.post(`${this.baseURL}/action/insertOne`, {
        collection: collection,
        database: 'chatsync',
        document: document
      }, { headers: this.headers });
      
      return response.data;
    } catch (error) {
      console.error('MongoDB Data API insertOne error:', error.message);
      throw error;
    }
  }
}

module.exports = MongoDataAPI;
