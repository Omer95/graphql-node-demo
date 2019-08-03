"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const serviceAcc = require('../service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAcc)
});
const apollo_server_1 = require("apollo-server");
// set up graphql schema
const typeDefs = apollo_server_1.gql `
    # A Twitter User
    type User {
        id: ID!
        name: String!
        screenName: String!
        statusesCount: Int!
        tweets: [Tweets]!
    }

    # A Tweet Object
    type Tweets {
        id: ID!
        text: String!
        userId: String!
        user: User!
        likes: Int!
    }

    type Query {
        tweets: [Tweets]
        user(id: String!): User
    }

`;
const resolvers = {
    Query: {
        async tweets() {
            const tweets = await admin.firestore()
                .collection('tweets')
                .get();
            return tweets.docs.map(tweet => tweet.data());
        },
        async user(_, args) {
            try {
                const userDoc = await admin
                    .firestore()
                    .doc(`users/${args.id}`).get();
                const user = userDoc.data();
                return user || new apollo_server_1.ValidationError('User ID not found');
            }
            catch (err) {
                throw new apollo_server_1.ApolloError(err);
            }
        }
    },
    User: {
        async tweets(user) {
            try {
                const userTweets = await admin
                    .firestore()
                    .collection('tweets')
                    .where('userId', '==', user.id)
                    .get();
                return userTweets.docs.map(tweet => tweet.data());
            }
            catch (err) {
                throw new apollo_server_1.ApolloError(err);
            }
        }
    },
    Tweets: {
        async user(tweet) {
            try {
                const tweetAuthor = await admin
                    .firestore()
                    .doc(`users/${tweet.userId}`)
                    .get();
                return tweetAuthor.data();
            }
            catch (err) {
                throw new apollo_server_1.ApolloError(err);
            }
        }
    }
};
const server = new apollo_server_1.ApolloServer({
    typeDefs, resolvers, introspection: true
});
server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
});
//# sourceMappingURL=index.js.map