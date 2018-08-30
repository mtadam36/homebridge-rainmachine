"use strict";

var Service, Characteristic;

var crypto = require("crypto");
var Client = require('node-rest-client').Client;

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-rainmachine", "RainMachine", RainMachine);
}

function RainMachine(log, config) {
  this.log = log;

  this.service = config.service;
  this.name = config.name;
  this.url = config.url;

  if (config.sn){
      this.sn = config.sn;
  } else {
      var shasum = crypto.createHash('sha1');
      shasum.update(this.name);
      this.sn = shasum.digest('base64');
      this.log('Computed SN ' + this.sn);
  }

  this.client = new Client();
}

function parseBool(val) {
  return val === true || val === "true"
}

RainMachine.prototype = {

    getPowerState: function (callback) {
        var requestUrl = this.url + "/status"
        this.log("Invoking " + requestUrl)
        this.client.get(requestUrl, function (data, response) {
          this.log("Got state from server:")
          //this.log(data)
          //this.log(data.status)
          //this.log(data.status.power)
          var currentState = false
          if (data && data.status && data.status.power) {
            this.log('Parsing bool from ' + data.status.power)
            currentState = parseBool(data.status.power)
          }
          this.log('Setting current state: ' + currentState)
          callback(null, currentState);
        }.bind(this));
    },

    setPowerState: function(powerOn, callback) {

      this.log("Setting NAD power to " + powerOn);

      var method = "/power_" + (powerOn ? "on" : "off")
      var requestUrl = this.url + method
      this.log("Invoking " + requestUrl)

      var args = {
        data: { power: powerOn },
        headers: { "Content-Type": "application/json" }
      }

      this.client.post(requestUrl, args, function (data, response) {
        this.log("Got response from server:" + data);
        callback();
      }.bind(this));

    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        this.log("Configuring services");

        var informationService = new Service.AccessoryInformation();

        informationService
                .setCharacteristic(Characteristic.Manufacturer, "RainMachine")
                .setCharacteristic(Characteristic.Model, "Touch HD")
                .setCharacteristic(Characteristic.SerialNumber, this.sn);

        this.service = new Service.Switch(this.name);
        this.service
                .getCharacteristic(Characteristic.On)
                .on('get', this.getPowerState.bind(this))
                .on('set', this.setPowerState.bind(this));


        return [this.service];
    }

}