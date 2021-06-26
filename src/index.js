const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');

const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

process.env.DB_URI;
const { DB_URI, DB_NAME } = process.env;

const typeDefs = gql`
	type Query {
		myTaskList: [TaskList!]!
	}

	type Mutation {
		signUp(input: SignUpInput): AuthUser!
		signIn(input: SignInInput): AuthUser!
	}

	input SignUpInput {
		email: String!
		password: String!
		name: String!
		avatar: String
	}

	input SignInInput {
		email: String!
		password: String!
	}

	type AuthUser {
		user: User!
		token: String!
	}

	type User {
		id: ID!
		name: String!
		email: String!
		avatar: String
	}
	type TaskList {
		id: ID!
		createAt: String!
		title: String!
		progress: Float!

		users: [User!]!
		todos: [ToDo!]!
	}
	type ToDo {
		id: ID!
		content: String!
		isCompleted: Boolean!

		taskListId: ID!
		taskList: TaskList
	}
`;

const resolvers = {
	Query: {
		myTaskList: () => [],
	},
	Mutation: {
		signUp: async (_, { input }, { db }) => {
			const hashedPassword = bcrypt.hashSync(input.password);
			const newUser = {
				...input,
				password: hashedPassword,
			};
			//save database
			const result = await db.collection('Users').insertOne(newUser);
			const user = result.ops[0];
			return {
				user,
				token: 'token',
			};
		},
		signIn: async (_, { input }, { db }) => {
			const user = await db.collection('Users').findOne({ email: input.email });
			if (!user) {
				throw new Error('Invalid credentials!');
			}
			// check if password is correct
			const isPasswordCorrect = bcrypt.compareSync(
				input.password,
				user.password,
			);
			if (!isPasswordCorrect) {
				throw new Error('Invalid credentials!');
			}

			return {
				user,
				token: 'token',
			};
		},
	},
	User: {
		id: ({ _id, id }) => _id || id,
	},
};

const start = async () => {
	const client = new MongoClient(DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	await client.connect();
	const db = client.db(DB_NAME);

	const context = {
		db,
	};

	// The ApolloServer constructor requires two parameters: your schema
	// definition and your set of resolvers.
	const server = new ApolloServer({ typeDefs, resolvers, context });

	// The `listen` method launches a web server.
	server.listen().then(({ url }) => {
		console.log(`🚀  Server ready at ${url}`);
	});
};

start();
