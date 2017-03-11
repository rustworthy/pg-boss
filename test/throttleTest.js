const assert = require('chai').assert;
const helper = require('./testHelper');

describe('throttle', function() {

    let boss;

    before(function(finished){
        helper.start()
            .then(dabauce => {
                boss = dabauce;
                finished();
            });
    });

    after(function(finished){
        boss.stop().then(() => finished());
    });

    it('should only create 1 job for interval with a delay', function(finished){

        const jobName = 'delayThrottle'
        const singletonSeconds = 4;
        const startIn = '2 seconds';

        const jobCount = 1;

        const publishInterval = 500;
        const assertTimeout = 4000;

        this.timeout(assertTimeout + 1000);

        let publishCount = 0;
        let subscribeCount = 0;

        boss.subscribe(jobName, function(job, done) {
            done().then(function() { subscribeCount++; });
        });

        setTimeout(function() {
            console.log('published ' + publishCount + ' jobs in '  + assertTimeout/1000 + ' seconds but received ' + subscribeCount + ' jobs');
            assert.isAtMost(subscribeCount, jobCount + 1);

            finished();

        }, assertTimeout);


        setInterval(function() {
            boss.publish(jobName, null, {startIn, singletonSeconds})
                .then(function() { publishCount++; });
        }, publishInterval);
    });

    it('should process at most 1 job per second', function (finished) {

        const singletonSeconds = 1;
        const jobCount = 3;
        const publishInterval = 100;
        const assertTimeout = jobCount * 1000;

        // add an extra second to test timeout
        this.timeout((jobCount + 1) * 1000);

        let publishCount = 0;
        let subscribeCount = 0;

        boss.subscribe('expensive', function(job, done) {
            done().then(function() { subscribeCount++; });
        });

        setTimeout(function() {
            console.log('published ' + publishCount + ' jobs in '  + assertTimeout/1000 + ' seconds but received ' + subscribeCount + ' jobs');
            assert.isAtMost(subscribeCount, jobCount + 1);

            finished();

        }, assertTimeout);


        setInterval(function() {
            boss.publish('expensive', null, {singletonSeconds: singletonSeconds})
                .then(function() { publishCount++; });
        }, publishInterval);

    });


    it('should queue successfully into next time slot if throttled', function (finished) {

        this.timeout(3000);

        const jobName = 'singleton';

        boss.publish(jobName, null, {singletonHours: 1})
            .then(jobId => {
                assert.isOk(jobId);
                return boss.publish(jobName, null, {singletonHours: 1, singletonNextSlot:true});
            })
            .then(jobId => {
                assert.isOk(jobId);
                finished();
            });

    });


    it('should reject 2nd request in the same time slot', function (finished) {

        this.timeout(3000);

        const jobName = 'singleton';

        boss.publish(jobName, null, {singletonDays: 1})
            .then(jobId => {
                assert.isOk(jobId);
                return boss.publish(jobName, null, {singletonDays: 1});
            })
            .then(jobId => {
                assert.isNotOk(jobId);
                finished();
            });

    });

});
