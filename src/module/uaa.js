'use strict';

import loginDialogTemplate from './login-dialog.html!text';

import angular from 'angular';
import 'angular-ui-router';
import 'angular-locker';
import 'angular-material';
import 'angular-messages';
import 'angular-animate';
import 'angular-http-auth';

import toolkitModule from 'ramkat99/xib-angular-toolkit'; // jshint unused: false
import {View, Component, Inject, Config, Service} from 'ramkat99/xib-angular-toolkit'; // jshint unused: false

let uaaModule = angular.module('xib-uaa-component', [
  'angular-locker',
  'ngRoute',
  'ui.router',
  'ngMaterial',
  'ngMessages',
  'ngAnimate',
  'http-auth-interceptor',
  toolkitModule.name
])
  .constant(
  "UAA_EVENTS", {
    LOAD_IDENTITY_START: "uaa:onLoadIdentityStart",
    LOAD_IDENTITY_SUCCESS: "uaa:onLoadIdentitySuccess",
    LOAD_IDENTITY_ERROR: "uaa:onLoadIdentityError",

    LOGIN_START: "uaa:onLoginStart",
    LOGIN_SUCCESS: "uaa:onLoginSuccess",
    LOGIN_FAILED: "uaa:onLoginFailed",

    LOGOUT_START: "uaa:onLogoutStart",
    LOGOUT_SUCCESS: "uaa:onLogoutSuccess",
    LOGOUT_FAILED: "uaa:onLogoutFailed",

    LOGIN_DIALOG_BEFORE_OPEN: "uaa:onLoginDialogBeforeOpened",
    LOGIN_DIALOG_OPENED: "uaa:onLoginDialogOpened",
    LOGIN_DIALOG_BEFORE_CLOSED: "uaa:onLoginDialogBeforeClosed",
    LOGIN_DIALOG_CLOSED: "uaa:onLoginDialogClosed",

    REQUEST_BUFFERED: "uaa:onRequestBuffered"
  })
  .config(['lockerProvider', function config(lockerProvider) {
    lockerProvider.defaults({
      driver: 'session',
      namespace: 'uaademo',
      separator: '.',
      eventsEnabled: true,
      extend: {}
    });
  }]);

const IDENTITY_KEY = "_identity_";

class Uaa {
  constructor(){
    this.signInTitle = "Sign In";
    this.loginDelay = 1500;
    this.triggers = { };
  }

  setSignInTitle(title){
    this.signInTitle = title;
  }

  @Inject('$rootScope', '$state', '$q', '$timeout', 'UAA_EVENTS', 'locker', '$http', '$mdDialog', 'authService')
  $get($rootScope, $state, $q, $timeout, UAA_EVENTS, locker, $http, $mdDialog, authService) {
    let provider =  {
      popLoginDialog: ()=>{
        provider.trigger(UAA_EVENTS.LOGIN_DIALOG_BEFORE_OPEN);
        return $mdDialog.show({
          controller: LoginDialogController,
          template: loginDialogTemplate,
          //parent: angular.element(document.body),
          bindToController: true,
          controllerAs: 'vm',
          locals: {
            title: this.signInTitle,
            loginDelay: this.loginDelay
          },
          clickOutsideToClose : false,
          fullscreen: false
        })
      },

      login: (credentials)=>{
        provider.trigger(UAA_EVENTS.LOGIN_START);
        let data = 'username=' + encodeURIComponent(credentials.username) +
          '&password=' + encodeURIComponent(credentials.password) +
          '&submit=Login';

        return $http.post('api/uaa/session/login', data, {
          ignoreAuthModule: true,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }).then((result)=>{
          provider.trigger(UAA_EVENTS.LOGIN_SUCCESS);

          // ok, lets confirm the login
          authService.loginConfirmed();

          // we automatically load the identity, seeing that we are authenticated
          provider.getIdentity();

        }, (error)=>{
          provider.trigger(UAA_EVENTS.LOGIN_FAILED);
          return $q.reject(error);
        });
      },

      logout: ()=>{
        authService.loginCancelled(null, "logout");
        provider.trigger(UAA_EVENTS.LOGOUT_START);
        return $http.get('api/uaa/session/logout', {}).then(()=>{
          provider.trigger(UAA_EVENTS.LOGOUT_SUCCESS);

          // also clear the identity from the locker
          locker.forget(IDENTITY_KEY);

        }, (error)=>{
          provider.trigger(UAA_EVENTS.LOGOUT_FAILED);
          return $q.reject(error);
        });
      },

      getIdentity: (loadFromServer = true)=>{
        provider.trigger(UAA_EVENTS.LOAD_IDENTITY_START);
        if (loadFromServer){
          return $http.get('api/uaa/session/identity')
            .then((result)=>{
              if (result.data){
                locker.put(IDENTITY_KEY, result.data);
                provider.trigger(UAA_EVENTS.LOAD_IDENTITY_SUCCESS, result.data);
                return result.data;
              } else {
                locker.forget(IDENTITY_KEY);
                return null;
              }
            }, (error)=>{
              provider.trigger(UAA_EVENTS.LOAD_IDENTITY_ERROR);
              locker.forget(IDENTITY_KEY);
              return $q.reject(error);
            });
        } else {
          return locker.get(IDENTITY_KEY, null);
        }
      },

      hasRole: (roleName)=> {
        let identity = provider.getIdentity(false);
        return identity && identity.roles && identity.roles.some((role)=>{
          return roleName === role.name
        });
      },

      hasAnyRole: (roles)=> {
        return roles.some((role)=>{
          return provider.hasRole(role);
        });
      },

      isAuthenticated: ()=>{
        return provider.getIdentity(false) != null;
      },

      trigger: (event, params, from)=>{
        console.log(event);
        if (this.triggers[event]) {
          for (let i in this.triggers[event]) {
            this.triggers[event][i].call(this, params, from);
          }
        }
      },

      getSignInTitle: () => {
        return this.signInTitle
      },

      $on: (event , callback)=>{
        if (!this.triggers[event]) {
          this.triggers[event] = [];
        }
        this.triggers[event].push(callback);
      }
    };

    $rootScope.$on("event:auth-loginRequired", (value)=>{
      provider.popLoginDialog();
    });

    return provider;
  }
}

@Inject('$state', 'Uaa', '$mdDialog', '$timeout', 'UAA_EVENTS')
class LoginDialogController {
  constructor($state, Uaa, $mdDialog, $timeout, UAA_EVENTS) {
    this.Uaa = Uaa;
    this.$mdDialog = $mdDialog;
    this.$timeout = $timeout;
    this.UAA_EVENTS = UAA_EVENTS;
    this.Uaa.trigger(UAA_EVENTS.LOGIN_DIALOG_OPENED);
  }

  submit(){
    this.loggingIn = true;

    this.Uaa.login({
      username: this.username,
      password: this.password,
    }).then((result)=>{
      this.$timeout(()=>{
        this.loggingIn = false;
        this.loginError = false;
        this.Uaa.trigger(this.UAA_EVENTS.LOGIN_DIALOG_BEFORE_CLOSED);
        this.$mdDialog.hide();
        this.Uaa.trigger(this.UAA_EVENTS.LOGIN_DIALOG_CLOSED);

      }, this.loginDelay);
    }, (error)=>{
      this.$timeout(()=> {
        console.log(error);
        this.loggingIn = false;
        this.loginError = true;

      }, this.loginDelay);
    })
  }
}

uaaModule.provider('Uaa', Uaa);


/*
@Service({
  serviceName: 'UaaService'
})
@Inject('$rootScope', '$state', '$q', '$timeout', 'UAA_EVENTS', 'locker', '$http', '$mdDialog')
class UaaService {
  constructor($rootScope, $state, $q, $timeout, UAA_EVENTS, locker, $http, $mdDialog){
    this.$rootScope = $rootScope;
    this.$state = $state;
    this.$q = $q;
    this.$timeout = $timeout;
    this.UAA_EVENTS = UAA_EVENTS;
    this.$http = $http;
    this.$mdDialog = $mdDialog;
  }

  anyRole(roles){
  }

  inRole(role){
  }

  isAuthenticated(){
  }

  getIdentity(forceReload = true){
    return this.$http.get('api/uaa/session/identity');
  }

  clearIdentity(){
  }

  popLoginDialog(){
    return this.$mdDialog.show({
      controller: LoginDialogController,
      template: loginDialogTemplate,
      //parent: angular.element(document.body),
      bindToController: true,
      controllerAs: 'vm',
      //targetEvent: ev,
      clickOutsideToClose : false,
      fullscreen: false
    })
  }

  login(credentials){
    let data = 'username=' + encodeURIComponent(credentials.username) +
      '&password=' + encodeURIComponent(credentials.password) +
      '&submit=Login';

    return this.$http.post('api/uaa/session/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  logout(){
    return this.$http.get('api/uaa/session/logout', {});
  }

  clearRequestBuffer(){
  }
}


*/

export default uaaModule;
//export {UaaProvider};