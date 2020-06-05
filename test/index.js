console.warn('Ensure that appropriate env vars are set for these tests!\n')

var assert = require('assert')
var AWS = require('aws-sdk')
var SNS = require('../lib/interface')

var SNS_ACCESS_KEY = process.env.SNS_ACCESS_KEY
var SNS_SECRET_ACCESS_KEY = process.env.SNS_SECRET_ACCESS_KEY
var ANDROID_ARN = process.env.SNS_ANDROID_ARN
// TODO
// var iOS_ARN = process.env.SNS_iOS_ARN
var PHONE_NUMBER = process.env.SNS_PHONE_NUMBER
// var EMAIL_ADDRESS = process.env.SNS_EMAIL_ADDRESS
var SNS_REGION = 'eu-west-1'

var sns = null
var snsForSms = null
// var snsForEmail = null

describe('SNS Module.', function () {
  this.timeout(20000)

  var theTopicArnThatThisTestCreated
  var thePushSubscriptionArnThatThisTestCreated,
    thePhoneSubscriptionArnThatThisTestCreated
    // theEmailSubscriptionArnThatThisTestCreated

  it('Should have events and supported platforms exposed on the interface', function () {
    assert(SNS.SUPPORTED_PLATFORMS)
    assert(SNS.EVENTS)
  })

  it('Should create an instance of Interface', function () {
    sns = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      region: SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_SECRET_ACCESS_KEY,
      platformApplicationArn: ANDROID_ARN
    })

    assert(sns)
  })

  it('Should return correct apiVersion, region, PlatformApplicationArn', function () {
    sns = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      region: SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_SECRET_ACCESS_KEY,
      platformApplicationArn: ANDROID_ARN
    })

    assert(sns)
    assert(sns.getApiVersion() === '2010-03-31')
    assert(sns.getRegion() === SNS_REGION)
    assert(sns.getPlatformApplicationArn() === ANDROID_ARN)
  })

  it('Should return correct apiVersion, region, PlatformApplicationArn when a custom SNS object is supplied', function () {
    sns = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      platformApplicationArn: ANDROID_ARN,
      sns: new AWS.SNS({ region: SNS_REGION, apiVersion: '2010-03-31' })
    })

    assert(sns)
    assert(sns.getApiVersion() === '2010-03-31')
    assert(sns.getRegion() === SNS_REGION)
    assert(sns.getPlatformApplicationArn() === ANDROID_ARN)
  })

  it('Should return correct apiVersion, region, PlatformApplicationArn when custom aws params are supplied', function () {
    sns = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      platformApplicationArn: ANDROID_ARN,
      sns: { region: SNS_REGION, apiVersion: '2014-02-01' }
    })

    assert(sns)
    assert(sns.getApiVersion() === '2014-02-01')
    assert(sns.getRegion() === SNS_REGION)
    assert(sns.getPlatformApplicationArn() === ANDROID_ARN)
  })

  // Replace SNS instance for each test
  beforeEach(function () {
    sns = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
      region: SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_SECRET_ACCESS_KEY,
      platformApplicationArn: ANDROID_ARN
    })
    snsForSms = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.SMS,
      region: SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_SECRET_ACCESS_KEY
    })
    snsForEmail = new SNS({
      platform: SNS.SUPPORTED_PLATFORMS.EMAIL,
      region: SNS_REGION,
      apiVersion: '2010-03-31',
      accessKeyId: SNS_ACCESS_KEY,
      secretAccessKey: SNS_SECRET_ACCESS_KEY
    })
  })

  it('Should return PlatformApplications list', function (done) {
    sns.getApplications(function (err, apps) {
      assert(!err)
      assert(apps)
      assert(apps.length >= 0)
      done()
    })
  })

  it('Should return Endpoints list for given PlatformApplication', function (done) {
    sns.getUsers(function (err, users) {
      assert(!err)
      assert(users)
      assert(users.length >= 0)
      done()
    })
  })

  it('Should add an Android user.', function (done) {
    sns.addUser('somefakedeviceidthatimadeup', JSON.stringify({
      username: 'fakeuser'
    }), function (err, endpointArn) {
      assert(!err)
      assert(endpointArn)
      done()
    })
  })

  it('Should retrieve a user by their EndpointArn and update their properties.', function (done) {
    sns.addUser('anotherfakedeviceidthatimadeup', JSON.stringify({
      username: 'fakeuserforattributetest'
    }), function (err, endpointArn) {
      assert(!err)
      sns.getUser(endpointArn, function (err, res) {
        assert(!err)
        var attributes = {
          CustomUserData: {
            user_id: 'updated-attribute-user-id'
          },
          Enabled: 'true'
        }
        sns.setAttributes(res.EndpointArn, attributes, function (err, res) {
          assert(!err)
          assert(res === attributes)

          sns.getUser(endpointArn, function (err, res) {
            assert(!err)
            assert(res.EndpointArn === endpointArn)
            assert(res.Attributes)
            assert(res.Attributes.Enabled === attributes.Enabled)
            assert(res.Attributes.CustomUserData)
            var responseUserData = JSON.parse(res.Attributes.CustomUserData)
            var userData = JSON.parse(attributes.CustomUserData)
            assert(responseUserData.user_id === userData.user_id)

            var emptyAttributes = {} // empty attributes should generate an error
            sns.setAttributes(endpointArn, emptyAttributes, function (err, res) {
              assert(err)

              sns.deleteUser(endpointArn, function (err) {
                // Cleanup: delete test user we created so that we can re-run the test
                done(err)
              })
            })
          })
        })
      })
    })
  })

  it('Should retrieve a user by their EndpointArn and delete them', function (done) {
    sns.addUser('somefakedeviceidthatimadeup', JSON.stringify({
      username: 'fakeuser'
    }), function (err, endpointArn) {
      assert(!err)
      sns.getUser(endpointArn, function (err, res) {
        assert(!err)
        assert(res.EndpointArn === endpointArn)
        done()

        sns.deleteUser(res.EndpointArn, function (err) {
          assert(!err)
          assert(res.ResponseMetadata)
        })
      })
    })
  })

  it('Should get all users on this PlatformApplication', function (done) {
    sns.getUsers(function (err, users) {
      assert(!err)
      assert(users)
      assert(users.length >= 0)
      done()
    })
  })

  it('Should send a message to all users on PlatformApplication, will add one first to ensure user exists.', function (done) {
    sns.addUser('somefakedeviceidthatimadeupagain', JSON.stringify({
      username: 'fakeuser2'
    }), function (err, endpointArn) {
      assert(!err)
      assert(endpointArn)

      sns.broadcastMessage('Hello to ALL the devices!', function (err, users) {
        assert(!err)
        done()
      })
    })
  })

  it('Should create a user and send a message to that Android user.', function (done) {
    sns.addUser('somefakedeviceidthatimadeup', JSON.stringify({
      username: 'fakeuser'
    }), function (err, endpointArn) {
      assert(!err)
      sns.sendMessage(endpointArn, 'Application test message', function (err, res) {
        assert(!err)
        assert(res)
        assert.strictEqual(typeof res, 'string')
        done()
      })
    })
  })

  it('Should send a message to a phone number.', function (done) {
    snsForSms.sendMessage(PHONE_NUMBER, 'SMS test message', function (err, res) {
      assert(!err)
      assert(res)
      assert.strictEqual(typeof res, 'string')
      done()
    })
  })

  /* Sending individual email does not seem to work, SNS complies about invalid ARN
  it('Should send a message to an email address.', function (done) {
    snsForEmail.sendMessage(EMAIL_ADDRESS, { subject: 'Notification', email: 'Email test message' }, function (err, res) {
      assert(!err)
      assert(res)
      assert.strictEqual(typeof res, 'string')
      done()
    })
  })
  */

  it('Should create a topic.', function (done) {
    sns.createTopic('this_is_a_test_dummy_486438735', function (err, topicArn) {
      assert(!err)
      assert(topicArn)
      theTopicArnThatThisTestCreated = topicArn
      done()
    })
  })

  it('Should list topics.', function (done) {
    sns.getTopics(function (err, topics) {
      assert(!err)
      assert(topics)
      assert(topics.length > 0)
      var theTopicThatWasCreatedEarlier = topics.filter(function (topic) {
        return topic.TopicArn === theTopicArnThatThisTestCreated
      })[0]
      assert(theTopicThatWasCreatedEarlier)
      done()
    })
  })

  it('Should subscribe a user to a topic.', function (done) {
    sns.addUser('yetanotherfakedeviceid', JSON.stringify({
      username: 'anotherfakeuser'
    }), function (err, endpointArn) {
      assert(!err)
      sns.subscribe(endpointArn, theTopicArnThatThisTestCreated, function (err, subscriptionArn) {
        assert(!err)
        assert(subscriptionArn)
        thePushSubscriptionArnThatThisTestCreated = subscriptionArn
        done()
      })
    })
  })

  it('Should subscribe a phone number to a topic.', function (done) {
    snsForSms.subscribe(PHONE_NUMBER, theTopicArnThatThisTestCreated, function (err, subscriptionArn) {
      assert(!err)
      assert(subscriptionArn)
      thePhoneSubscriptionArnThatThisTestCreated = subscriptionArn
      done()
    })
  })

  /* Email subscription requires the user to confirm it via a link, not easy to be done in tests
  it('Should subscribe an email address to a topic.', function (done) {
    snsForEmail.subscribe(EMAIL_ADDRESS, theTopicArnThatThisTestCreated, function (err, subscriptionArn) {
      assert(!err)
      assert(subscriptionArn)
      theEmailSubscriptionArnThatThisTestCreated = subscriptionArn
      done()
    })
  })
  */

  it('Should list all subscriptions.', function (done) {
    sns.getSubscriptions(function (err, subscriptions) {
      assert(!err)
      assert(subscriptions)
      assert(subscriptions.length > 0)
      var theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === thePushSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === thePhoneSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      /* Email subscription requires the user to confirm it via a link, not easy to be done in tests
      theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === theEmailSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      */
      done()
    })
  })

  it('Should list subscriptions by topic.', function (done) {
    sns.getSubscriptions(theTopicArnThatThisTestCreated, function (err, subscriptions) {
      assert(!err)
      assert(subscriptions)
      assert(subscriptions.length > 0)
      var theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === thePushSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === thePhoneSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      /* Email subscription requires the user to confirm it via a link, not easy to be done in tests
      theSubscriptionThatWasCreatedEarlier = subscriptions.filter(function (subscription) {
        return subscription.SubscriptionArn === theEmailSubscriptionArnThatThisTestCreated
      })[0]
      assert(theSubscriptionThatWasCreatedEarlier)
      */
      done()
    })
  })

  it('Should fail to publish a message to a topic if message body is missing "default" key.', function (done) {
    sns.publishToTopic(theTopicArnThatThisTestCreated, {
      foo: 'missing top-level key "default"'
    }, function (err, res) {
      assert(err)
      assert.strictEqual(err.message, 'Argument "message" must be in SNS multi-platform publishing format.')
      done()
    })
  })

  it('Should fail to publish a message to a topic if "default" value in message body is not a string.', function (done) {
    sns.publishToTopic(theTopicArnThatThisTestCreated, {
      default: {
        that: 'is_not_a_string_but_an_object'
      }
    }, function (err, res) {
      assert(err)
      assert.strictEqual(err.message, 'Argument "message" must be in SNS multi-platform publishing format.')
      done()
    })
  })

  it('Should publish a message to a topic.', function (done) {
    var messageBody = {
      default: 'Default message',
      APNS: { aps: { alert: 'Message for iOS' } },
      GCM: { data: { message: 'Message for Android' } },
      sms: 'Message for SMS',
      email: 'Message for email'
    }
    sns.publishToTopic(theTopicArnThatThisTestCreated, messageBody, function (err, res) {
      assert(!err)
      assert(res)
      assert.strictEqual(typeof res, 'string')
      done()
    })
  })

  it('Should unsubscribe a user from a topic.', function (done) {
    sns.unsubscribe(thePushSubscriptionArnThatThisTestCreated, function (err) {
      assert(!err)
      done()
    })
  })

  it('Should unsubscribe a phone number from a topic.', function (done) {
    sns.unsubscribe(thePhoneSubscriptionArnThatThisTestCreated, function (err) {
      assert(!err)
      done()
    })
  })

  /* Email subscription requires the user to confirm it via a link, not easy to be done in tests
  it('Should unsubscribe an email address from a topic.', function (done) {
    sns.unsubscribe(theEmailSubscriptionArnThatThisTestCreated, function (err) {
      assert(!err)
      done()
    })
  })
  */

  it('Should delete a topic.', function (done) {
    sns.deleteTopic(theTopicArnThatThisTestCreated, function (err) {
      assert(!err)
      done()
    })
  })
})
