'use strict';

import template from './app.html!text';

import angular from 'angular';
import 'angular-animate';
import 'angular-ui-router';
import 'angular-material';
import 'angular-messages';
import 'angular-route';
import 'angular-sanitize';
import "angular-material-icons";

import 'material-design-icons/iconfont/material-icons.css!css';

import toolkitModule from 'ramkat99/xib-angular-toolkit'; // jshint unused: false
import {View, Component, Inject, Config} from 'ramkat99/xib-angular-toolkit'; // jshint unused: false

import uaaModule from '../module/uaa.js';

let appModule = angular.module('app-module', [
  'ui.router',
  'ngRoute',
  'ngSanitize',
  'ngMessages',
  'ngMaterial',
  'ngMdIcons',
  uaaModule.name,
  toolkitModule.name
])
  .config(['UaaProvider', '$stateProvider', '$urlRouterProvider', '$httpProvider', '$mdIconProvider', '$mdThemingProvider',
  (UaaProvider, $stateProvider, $urlRouterProvider, $httpProvider, $mdIconProvider, $mdThemingProvider) =>{

    UaaProvider.setSignInTitle("Uaa Module Sign In");

    $httpProvider.defaults.timeout = 20000;
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

    $mdIconProvider.defaultIconSet('images/icons/mdi.svg');
    $mdThemingProvider.theme('default').primaryPalette('red');
}]);

appModule.factory('$exceptionHandler', function() {
  return function errorCatcherHandler(exception, cause) {
    console.error(exception);
    //if (window.OnClientError) window.OnClientError(exception);
  };
});

@Component({
  selector: 'app'
})
@View({
  template: template,
  replace: true
})
@Inject('$state', 'Uaa', 'UAA_EVENTS', '$http', 'Uaa')
class App {
  constructor($state, Uaa, UAA_EVENTS, $http) {
    this.Uaa = Uaa;
    this.$http = $http;
    this.identity = null;

    Uaa.$on(UAA_EVENTS.LOGOUT_SUCCESS, ()=>{
      this.identity = null;
    });

    Uaa.$on(UAA_EVENTS.LOAD_IDENTITY_SUCCESS, (identity)=>{
      this.identity = identity;
    });

    Uaa.$on(UAA_EVENTS.LOGIN_DIALOG_BEFORE_OPEN, ()=>{
      //alert(UAA_EVENTS.LOGIN_DIALOG_BEFORE_OPEN);
    });

    Uaa.$on(UAA_EVENTS.LOGIN_DIALOG_OPENED, ()=>{
      //alert(UAA_EVENTS.LOGIN_DIALOG_OPENED);
    });

    Uaa.getIdentity().then((identity)=>{
      console.log(identity);
      console.log(Uaa.hasRole("Performer"));
    });


  }

  popDialog(){
    this.Uaa.popLoginDialog();
  }

  logout(){
    this.Uaa.logout();
  }

  doCall(){
    this.$http.post("api/domains/search");
    this.$http.post("api/domains/search");
    this.$http.post("api/domains/search");
    this.$http.post("api/domains/search");
  }
}

angular.element(document).ready(function() {
  angular.bootstrap(document, [appModule.name], {
    strictDi: true
  });
});

export default appModule;




/*class IconConfig {
 @Config()
 @Inject()
 static configFactory($mdIconProvider, $mdThemingProvider){

 }
 }*/

/*
 class UaaConfig {
 @Config()
 @Inject('UaaProvider')
 static configFactory(UaaProvider){
 UaaProvider.setSignInTitle("Hello World");
 }
 }
 */
/*

 appModule.provider('Stuffies', function UnicornLauncherProvider() {
 var useTinfoilShielding = false;

 this.useTinfoilShielding = function(value) {
 useTinfoilShielding = !!value;
 };

 this.$get = function unicornLauncherFactory() {
 return {
 hello: ()=>{
 console.log('hello');
 }
 }
 };
 });


 appModule.config(['StuffiesProvider', (Stuffies)=>{
 console.log("configuring");
 //UaaProvider.setSignInTitle("Hello World");
 }]);
 */

/*class HttpConfig {
 @Config()
 @Inject('$stateProvider', '$urlRouterProvider', '$httpProvider')
 static configFactory($stateProvider, $urlRouterProvider, $httpProvider){
 }
 }*/