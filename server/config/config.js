var config = {

  // MongoDB Settings
  mongo: {
    host: 'localhost',
    port: '', // leave it blank for default port 27017
    db: '',
    user: '',
    password: ''
  },

  // Email Settings
  email: {
    subscribe: 0,
    signup: 1
  }


};

module.exports = config;

