FROM dockerfile/nodejs
COPY . /myApp/
RUN cd /myApp/; npm install
CMD ["node", "/myApp/index.js"]