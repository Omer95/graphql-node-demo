import * as admin from 'firebase-admin';

const serviceAcc = require('../service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAcc)
});

import { ApolloServer, ApolloError, ValidationError, gql } from 'apollo-server';
import { userInfo } from 'os';

interface User {
    id: string;
    name: string;
    screenName: string;
    statusesCount: number;
}

interface Tweet {
    id: string;
    name: string;
    screenName: string;
    statusesCount: number;
    userId: string;
}

// set up graphql schema
const typeDefs = gql`
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

`
const resolvers = {
    Query: {
        async tweets() {
            const tweets = await admin.firestore()
            .collection('tweets')
            .get();
            return tweets.docs.map(tweet => tweet.data()) as Tweet[];
        },
        async user(_: null, args: {id: string}) {
            try {
                const userDoc = await admin
                .firestore()
                .doc(`users/${args.id}`).get();
                const user = userDoc.data() as User | undefined;
                return user || new ValidationError('User ID not found');
            } catch (err) {
                throw new ApolloError(err);
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
                return userTweets.docs.map(tweet => tweet.data()) as Tweet[]
            } catch (err) {
                throw new ApolloError(err);
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
                return tweetAuthor.data() as User;
            } catch (err) {
                throw new ApolloError(err);
            }
        }
    }
};

const server = new ApolloServer({
    typeDefs, resolvers, introspection: true
});
server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
});

