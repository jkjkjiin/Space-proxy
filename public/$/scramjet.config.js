self.__scramjet$config = {
  prefix: "/$/space/",
  files: {
    wasm: "/$/scramjet.wasm.js",
    worker: "/$/scramjet.worker.js",
    client: "/$/scramjet.client.js",
    shared: "/$/scramjet.shared.js",
    sync: "/$/scramjet.sync.js"
  },
  siteFlags: {},
  flags: {
    serviceworkers: true,
    rewriterLogs: false
  },

  codec: {
    // Function to encode the URL to base64 format after encoding URI components
    encode: (url) => {
      if (!url) return url;
      try {
        return btoa(encodeURIComponent(url.toString()));
      } catch (error) {
        console.error("Encoding error:", error);
        return url;  // Return the original URL if there's an error
      }
    },

    // Function to decode base64 URL and decode URI components
    decode: (url) => {
      if (!url) return url;
      try {
        return decodeURIComponent(atob(url.toString()));
      } catch (error) {
        console.error("Decoding error:", error);
        return url;  // Return the original URL if there's an error
      }
    }
  }
};
