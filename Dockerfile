FROM dockerfile/nodejs
COPY . /myApp/
RUN cd /myApp/; npm install
EXPOSE 8080
CMD ["node", "/myApp/index.js"]