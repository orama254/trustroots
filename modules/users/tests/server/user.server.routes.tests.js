'use strict';

var should = require('should'),
    request = require('supertest'),
    path = require('path'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    express = require(path.resolve('./config/lib/express'));

/**
 * Globals
 */
var app, agent, credentials, user, _user, admin;

/**
 * User routes tests
 */
describe('User CRUD tests', function () {

  before(function (done) {
    // Get application
    app = express.init(mongoose);
    agent = request.agent(app);

    done();
  });

  beforeEach(function (done) {
    // Create user credentials
    credentials = {
      username: 'TR_username',
      password: 'M3@n.jsI$Aw3$0m3'
    };

    // Create a new user
    _user = {
      firstName: 'Full',
      lastName: 'Name',
      displayName: 'Full Name',
      email: 'test@test.com',
      username: credentials.username.toLowerCase(),
      displayUsername: credentials.username,
      password: credentials.password,
      provider: 'local'
    };

    user = new User(_user);

    // Save a user to the test db
    user.save(function (err) {
      should.not.exist(err);
      done(err);
    });
  });

  it('should be able to register a new user', function (done) {

    _user.username = 'Register_New_User';
    _user.email = 'register_new_user_@test.com';

    agent.post('/api/auth/signup')
      .send(_user)
      .expect(200)
      .end(function (signupErr, signupRes) {
        // Handle signpu error
        if (signupErr) {
          return done(signupErr);
        }
        signupRes.body.username.should.equal(_user.username.toLowerCase());
        signupRes.body.username.should.not.equal(_user.username);
        signupRes.body.displayUsername.should.equal(_user.username);
        signupRes.body.email.should.equal(_user.email);
        signupRes.body.emailTemporary.should.equal(_user.email);
        signupRes.body.provider.should.equal('local');
        signupRes.body.public.should.equal(false);
        signupRes.body.created.should.not.be.empty();
        should.not.exist(signupRes.body.updated);
        // Sensitive information should be not sent to the client
        should.not.exist(signupRes.body.emailToken);
        should.not.exist(signupRes.body.password);
        should.not.exist(signupRes.body.salt);
        // Assert we have just the default 'user' role
        signupRes.body.roles.should.be.instanceof(Array).and.have.lengthOf(1);
        signupRes.body.roles.indexOf('user').should.equal(0);
        done();
      });
  });

  it('should be able to register a new user and confirm email with token and user should become public', function (done) {

    _user.username = 'Register_New_User';
    _user.email = 'register_new_user_@test.com';

    agent.post('/api/auth/signup')
      .send(_user)
      .expect(200)
      .end(function (signupErr, signupRes) {
        // Handle signpu error
        if (signupErr) {
          return done(signupErr);
        }

        signupRes.body.public.should.equal(false);
        should.not.exist(signupRes.body.emailToken);
        should.not.exist(signupRes.body.password);
        should.not.exist(signupRes.body.salt);
        signupRes.body.emailTemporary.should.equal(_user.email);

        User.findOne({ username: _user.username.toLowerCase() }, function(err, userRes1) {
          if (err) {
            return done(err);
          }

          userRes1.public.should.equal(false);
          userRes1.email.should.not.be.empty();
          userRes1.emailToken.should.not.be.empty();

          // GET should give us redirect
          agent.get('/api/auth/confirm-email/' + userRes1.emailToken)
            .expect(302)
            .end(function (confirmEmailPostErr, confirmEmailGetRes) {
              if (confirmEmailPostErr) {
                return done(confirmEmailPostErr);
              }

              // NodeJS v4 changed the status code representation so we must check
              // before asserting, to be comptabile with all node versions.
              if (process.version.indexOf('v4') === 0 || process.version.indexOf('v5') === 0) {
                confirmEmailGetRes.text.should.equal('Found. Redirecting to /confirm-email/' + userRes1.emailToken);
              } else {
                confirmEmailGetRes.text.should.equal('Moved Temporarily. Redirecting to /confirm-email/' + userRes1.emailToken);
              }

              // POST does the actual job
              agent.post('/api/auth/confirm-email/' + userRes1.emailToken)
                .expect(200)
                .end(function (confirmEmailPostErr, confirmEmailPostRes) {
                  if (confirmEmailPostErr) {
                    return done(confirmEmailPostErr);
                  }

                  // User should now be public
                  confirmEmailPostRes.body.profileMadePublic.should.equal(true);
                  confirmEmailPostRes.body.user.public.should.equal(true);
                  confirmEmailPostRes.body.user.emailTemporary.should.be.empty();

                  // Sensitive information should be not sent to the client
                  should.not.exist(confirmEmailPostRes.body.user.emailToken);
                  should.not.exist(confirmEmailPostRes.body.user.password);
                  should.not.exist(confirmEmailPostRes.body.user.salt);

                  return done();
                });
              });
          });
      });
  });

  it('should be able to register a new user and confirming email with wrong token should redirect error and yeld an error and user should not be public', function (done) {

    _user.username = 'Register_New_User';
    _user.email = 'register_new_user_@test.com';

    agent.post('/api/auth/signup')
      .send(_user)
      .expect(200)
      .end(function (signupErr, signupRes) {
        // Handle signpu error
        if (signupErr) {
          return done(signupErr);
        }

        signupRes.body.public.should.equal(false);
        should.not.exist(signupRes.body.emailToken);
        should.not.exist(signupRes.body.password);
        should.not.exist(signupRes.body.salt);
        signupRes.body.emailTemporary.should.equal(_user.email);

        User.findOne({ username: _user.username.toLowerCase() }, function(err, userRes1) {
          if (err) {
            return done(err);
          }

          userRes1.public.should.equal(false);
          userRes1.email.should.not.be.empty();
          userRes1.emailToken.should.not.be.empty();

          // GET should give us redirect
          agent.get('/api/auth/confirm-email/WRONG_TOKEN')
            .expect(302)
            .end(function (confirmEmailPostErr, confirmEmailGetRes) {
              if (confirmEmailPostErr) {
                return done(confirmEmailPostErr);
              }

              // NodeJS v4 changed the status code representation so we must check
              // before asserting, to be comptabile with all node versions.
              if (process.version.indexOf('v4') === 0 || process.version.indexOf('v5') === 0) {
                confirmEmailGetRes.text.should.equal('Found. Redirecting to /confirm-email-invalid');
              } else {
                confirmEmailGetRes.text.should.equal('Moved Temporarily. Redirecting to /confirm-email-invalid');
              }

              // POST does the actual job
              agent.post('/api/auth/confirm-email/WRONG_TOKEN')
                .expect(200)
                .end(function (confirmEmailPostErr, confirmEmailPostRes) {
                  if (confirmEmailPostErr) {
                    return done(confirmEmailPostErr);
                  }

                  console.log(confirmEmailPostRes);

                  // User should now be public
                  //confirmEmailPostRes.body.profileMadePublic.should.equal(true);
                  //confirmEmailPostRes.body.user.public.should.equal(true);
                  //confirmEmailPostRes.body.user.emailTemporary.should.be.empty();

                  // Sensitive information should be not sent to the client
                  //should.not.exist(confirmEmailPostRes.body.user.emailToken);
                  //should.not.exist(confirmEmailPostRes.body.user.password);
                  //should.not.exist(confirmEmailPostRes.body.user.salt);

                  return done();
                });
              });
          });
      });
  });

  it('should be able to login successfully using username and logout successfully', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Sensitive information should be not sent to the client
        should.not.exist(signinRes.body.emailToken);
        should.not.exist(signinRes.body.password);
        should.not.exist(signinRes.body.salt);

        // Logout
        agent.get('/api/auth/signout')
          .expect(302)
          .end(function (signoutErr, signoutRes) {
            if (signoutErr) {
              return done(signoutErr);
            }

            signoutRes.redirect.should.equal(true);

            // NodeJS v4 changed the status code representation so we must check
            // before asserting, to be comptabile with all node versions.
            if (process.version.indexOf('v4') === 0 || process.version.indexOf('v5') === 0) {
              signoutRes.text.should.equal('Found. Redirecting to /');
            } else {
              signoutRes.text.should.equal('Moved Temporarily. Redirecting to /');
            }

            return done();
          });
      });
  });

  it('should be able to login successfully using email and logout successfully', function (done) {

    // In place of username, we can send an email
    var emailCredentials = credentials;
    emailCredentials.username = 'test@test.com';

    agent.post('/api/auth/signin')
      .send(emailCredentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Logout
        agent.get('/api/auth/signout')
          .expect(302)
          .end(function (signoutErr, signoutRes) {
            if (signoutErr) {
              return done(signoutErr);
            }

            signoutRes.redirect.should.equal(true);

            // NodeJS v4 changed the status code representation so we must check
            // before asserting, to be comptabile with all node versions.
            if (process.version.indexOf('v4') === 0 || process.version.indexOf('v5') === 0) {
              signoutRes.text.should.equal('Found. Redirecting to /');
            } else {
              signoutRes.text.should.equal('Moved Temporarily. Redirecting to /');
            }

            return done();
          });
      });
  });

  it('forgot password should return 400 for non-existent username', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: 'some_username_that_doesnt_exist'
        })
        .expect(404)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          res.body.message.should.equal('We could not find an account with that username or email. Make sure you have it spelled correctly.');
          return done();
        });
    });
  });

  it('forgot password should return 400 for no username provided', function (done) {
    var provider = 'facebook';
    user.provider = provider;
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: ''
        })
        .expect(400)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          res.body.message.should.equal('Please, we really need your username or email first...');
          return done();
        });
    });
  });

  it('forgot password should be able to reset password for user password reset request using username', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: user.username
        })
        .expect(200)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          User.findOne({ username: user.username.toLowerCase() }, function(err, userRes) {
            userRes.resetPasswordToken.should.not.be.empty();
            should.exist(userRes.resetPasswordExpires);
            res.body.message.should.be.equal('Password reset sent.');
            return done();
          });
        });
    });
  });

  it('forgot password should be able to reset password for user password reset request using email', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: user.email
        })
        .expect(200)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          User.findOne({ email: user.email.toLowerCase() }, function(err, userRes) {
            userRes.resetPasswordToken.should.not.be.empty();
            should.exist(userRes.resetPasswordExpires);
            res.body.message.should.be.equal('Password reset sent.');
            return done();
          });
        });
    });
  });

  it('forgot password should be able to reset the password using reset token', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: user.username
        })
        .expect(200)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          User.findOne({ username: user.username.toLowerCase() }, function(err, userRes) {
            userRes.resetPasswordToken.should.not.be.empty();
            should.exist(userRes.resetPasswordExpires);
            agent.get('/api/auth/reset/' + userRes.resetPasswordToken)
            .expect(302)
            .end(function (err, res) {
              // Handle error
              if (err) {
                return done(err);
              }
              res.headers.location.should.be.equal('/password/reset/' + userRes.resetPasswordToken);
              return done();
            });
          });
        });
    });
  });


  it('forgot password should return error when using invalid reset token', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/forgot')
        .send({
          username: user.username
        })
        .expect(200)
        .end(function (err, res) {
          // Handle error
          if (err) {
            return done(err);
          }

          var invalidToken = 'someTOKEN1234567890';
          agent.get('/api/auth/reset/' + invalidToken)
          .expect(302)
          .end(function (err, res) {
            // Handle error
            if (err) {
              return done(err);
            }

            res.headers.location.should.be.equal('/password/reset/invalid');

            return done();
          });
        });
    });
  });

  it('should be able to change user own password successfully', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Change password
        agent.post('/api/users/password')
          .send({
            newPassword: '1234567890Aa$',
            verifyPassword: '1234567890Aa$',
            currentPassword: credentials.password
          })
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            res.body.message.should.equal('Password changed successfully!');
            return done();
          });
      });
  });

  it('should not be able to change user own password if wrong verifyPassword is given', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Change password
        agent.post('/api/users/password')
          .send({
            newPassword: '1234567890Aa$',
            verifyPassword: '1234567890-ABC-123-Aa$',
            currentPassword: credentials.password
          })
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            res.body.message.should.equal('Passwords do not match.');
            return done();
          });
      });
  });

  it('should not be able to change user own password if wrong currentPassword is given', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Change password
        agent.post('/api/users/password')
          .send({
            newPassword: '1234567890Aa$',
            verifyPassword: '1234567890Aa$',
            currentPassword: 'some_wrong_passwordAa$'
          })
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            res.body.message.should.equal('Current password is incorrect.');
            return done();
          });
      });
  });

  it('should not be able to change user own password if no new password is at all given', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Change password
        agent.post('/api/users/password')
          .send({
            newPassword: '',
            verifyPassword: '',
            currentPassword: credentials.password
          })
          .expect(400)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            res.body.message.should.equal('Please provide a new password.');
            return done();
          });
      });
  });

  it('should not be able to change user own password if no new password is at all given', function (done) {

    // Change password
    agent.post('/api/users/password')
      .send({
        newPassword: '1234567890Aa$',
        verifyPassword: '1234567890Aa$',
        currentPassword: credentials.password
      })
      .expect(403)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.message.should.equal('Forbidden.');
        return done();
      });
  });

  it('should be able to get own user details successfully even when profile is still non-public', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get own user details
        agent.get('/api/users/' + credentials.username.toLowerCase())
          .expect(200)
          .end(function (err, res) {
            if (err) {
              return done(err);
            }

            res.body.should.be.instanceof(Object);
            res.body.username.should.equal(user.username);
            res.body.displayUsername.should.equal(user.displayUsername);
            res.body.public.should.equal(false); // Unpublic right after signup
            res.body.avatarSource.should.equal('gravatar'); // Defaults to `gravatar`
            should.exist(res.body.languages);
            should.exist(res.body.gender);
            should.exist(res.body.description);
            should.exist(res.body.tagline);
            should.exist(res.body.avatarUploaded);
            should.exist(res.body.avatarSource);
            should.exist(res.body.created);
            should.exist(res.body.emailHash);
            should.not.exist(res.body.salt);
            should.not.exist(res.body.password);
            return done();
          });
      });
  });

  it('should not be able to get any user details if not logged in', function (done) {
    // Get own user details
    agent.get('/api/users/' + user.username)
      .expect(403)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        res.body.message.should.equal('Forbidden.');
        return done();
      });
  });

  it('should be able to update own user details', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/signin')
        .send(credentials)
        .expect(200)
        .end(function (signinErr, signinRes) {
          // Handle signin error
          if (signinErr) {
            return done(signinErr);
          }

          var userUpdate = {
            firstName: 'user_update_first',
            lastName: 'user_update_last',
          };

          agent.put('/api/users')
            .send(userUpdate)
            //.expect(200)
            .end(function (userInfoErr, userInfoRes) {
              if (userInfoErr) {
                return done(userInfoErr);
              }

              userInfoRes.body.should.be.instanceof(Object);
              userInfoRes.body.firstName.should.be.equal('user_update_first');
              userInfoRes.body.lastName.should.be.equal('user_update_last');
              userInfoRes.body.roles.should.be.instanceof(Array).and.have.lengthOf(1);
              userInfoRes.body.roles.indexOf('user').should.equal(0);
              userInfoRes.body._id.should.be.equal(String(user._id));

              // Call the assertion callback
              return done();
            });
        });
    });
  });

  it('should not be able to update own user details and add roles', function (done) {
    user.roles = ['user'];

    user.save(function (err) {
      should.not.exist(err);
      agent.post('/api/auth/signin')
        .send(credentials)
        .expect(200)
        .end(function (signinErr, signinRes) {
          // Handle signin error
          if (signinErr) {
            return done(signinErr);
          }

          var userUpdate = {
            firstName: 'user_update_first',
            lastName: 'user_update_last',
            roles: ['user', 'admin']
          };

          agent.put('/api/users')
            .send(userUpdate)
            .expect(200)
            .end(function (userInfoErr, userInfoRes) {
              if (userInfoErr) {
                return done(userInfoErr);
              }

              userInfoRes.body.should.be.instanceof(Object);
              userInfoRes.body.firstName.should.be.equal('user_update_first');
              userInfoRes.body.lastName.should.be.equal('user_update_last');
              userInfoRes.body.roles.should.be.instanceof(Array).and.have.lengthOf(1);
              userInfoRes.body.roles.indexOf('user').should.equal(0);
              userInfoRes.body._id.should.be.equal(String(user._id));

              // Call the assertion callback
              return done();
            });
        });
    });
  });

  it('should not be able to update own user details with existing email', function (done) {

    var _user2 = _user;

    _user2.username = 'user2_username';
    _user2.email = 'user2_email@test.com';

    var credentials2 = {
      username: 'username2',
      password: 'M3@n.jsI$Aw3$0m3'
    };

    _user2.username = credentials2.username;
    _user2.password = credentials2.password;

    var user2 = new User(_user2);

    user2.save(function (err) {
      should.not.exist(err);

      agent.post('/api/auth/signin')
        .send(credentials2)
        .expect(200)
        .end(function (signinErr, signinRes) {
          // Handle signin error
          if (signinErr) {
            return done(signinErr);
          }

          var userUpdate = {
            firstName: 'user_update_first',
            lastName: 'user_update_last',
            email: user.email
          };

          agent.put('/api/users')
            .send(userUpdate)
            .expect(403)
            .end(function (userInfoErr, userInfoRes) {
              if (userInfoErr) {
                return done(userInfoErr);
              }

              // Call the assertion callback
              userInfoRes.body.message.should.equal('This email is already in use. Please use another one.');

              return done();
            });
        });
    });
  });

  it('should not be able to update own user details if not logged-in', function (done) {
    user.roles = ['user'];

    user.save(function (err) {

      should.not.exist(err);

      var userUpdate = {
        firstName: 'user_update_first',
        lastName: 'user_update_last',
      };

      agent.put('/api/users')
        .send(userUpdate)
        .expect(403)
        .end(function (userInfoErr, userInfoRes) {
          if (userInfoErr) {
            return done(userInfoErr);
          }

          userInfoRes.body.message.should.equal('Forbidden.');

          // Call the assertion callback
          return done();
        });
    });
  });

  it('should not be able to update own user profile picture without being logged-in', function (done) {

    agent.post('/api/users-avatar')
      .send({})
      .expect(403)
      .end(function (userInfoErr, userInfoRes) {
        if (userInfoErr) {
          return done(userInfoErr);
        }

        userInfoRes.body.message.should.equal('Forbidden.');

        // Call the assertion callback
        return done();
      });
  });

  it('should be able to change profile picture to a jpg file when logged-in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        agent.post('/api/users-avatar')
          .attach('avatar', './modules/users/tests/server/img/avatar.jpg')
          .send(credentials)
          .expect(200)
          .end(function (userInfoErr, userInfoRes) {
            // Handle change profile picture error
            if (userInfoErr) {
              return done(userInfoErr);
            }

            userInfoRes.body.message.should.equal('Avatar image uploaded.');

            return done();
          });
      });
  });

  it('should be able to change profile picture to a gif file when logged-in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        agent.post('/api/users-avatar')
          .attach('avatar', './modules/users/tests/server/img/avatar.gif')
          .send(credentials)
          .expect(200)
          .end(function (userInfoErr, userInfoRes) {
            // Handle change profile picture error
            if (userInfoErr) {
              return done(userInfoErr);
            }

            userInfoRes.body.message.should.equal('Avatar image uploaded.');

            return done();
          });
      });
  });

  it('should be able to change profile picture to a png file when logged-in', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        agent.post('/api/users-avatar')
          .attach('avatar', './modules/users/tests/server/img/avatar.png')
          .send(credentials)
          .expect(200)
          .end(function (userInfoErr, userInfoRes) {
            // Handle change profile picture error
            if (userInfoErr) {
              return done(userInfoErr);
            }

            userInfoRes.body.message.should.equal('Avatar image uploaded.');

            return done();
          });
      });
  });

  it('should not be able to change profile picture if attach a picture with a different field name', function (done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function (signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        agent.post('/api/users-avatar')
          .attach('fieldThatDoesntWork', './modules/users/tests/server/img/avatar.jpg')
          .send(credentials)
          .expect(400)
          .end(function (userInfoErr, userInfoRes) {
            done(userInfoErr);
          });
      });
  });

  afterEach(function (done) {
    User.remove().exec(done);
  });
});