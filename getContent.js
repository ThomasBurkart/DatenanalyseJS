
var request = require('sync-request');
var xml2js = require('xml2js');
var Twitter = require('twitter');

var rssFeeds = [
    "http://www.spiegel.de/schlagzeilen/index.rss",
    "http://www.welt.de/?service=Rss",
    "http://rss.focus.de/fol/XML/rss_folnews.xml",
    "http://rss.sueddeutsche.de/app/service/rss/alles/index.rss?output=rss",
    "http://newsfeed.zeit.de/all"
];

var twitterFeeds = [
    "SPIEGELONLINE",
    "welt",
    "focusonline",
    "SZ",
    "zeitonline"
];

var client = new Twitter({
});


for(var i = 0; i < twitterFeeds.length; i++) {

    // Twitter
    var twitterUid = twitterFeeds[i];

    var params = {screen_name: twitterUid, count: 5, trim_user: true};
    client.get('statuses/user_timeline', params, function (error, tweets, response) {
        if (!error) {
            console.log(tweets);
        }
    });

    // RSS Feed
    var rssLink = rssFeeds[i];
    console.log("start crawling" + rssLink);
    var rssContent = crawlFeed(rssLink);
    var xmlContent = xml2js.parseString(rssContent, function (err, result) {
        console.dir(result);
        console.log('Done');
    });

}


function crawlFeed(link) {
    var res = request('GET', link);
    return res.body.toString('utf-8');
}

