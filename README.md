# sockel

## A TypeScript way of writing WebSocket applications

This libray is a wrapper around the standard implementations of WebSocket libraries (both Server and Client side).
It tries to enable developers to write WebSocket application that look more like standard API requests on both sides.

Some features include:

-   General
    -   Streamlining how messages have to look like between client and servers
    -   Routes can be declared on global scope without tinkering with the onconnection callback etc.
    -   Coming soon
        -   Automatic json schema validation before passing the data into your route callback
-   Server
    -   Built in user management
        -   You don't have to store your connection in an extra format, sockel already handles
            every incoming connection and stores them in the format that you need
    -   Globaly declared routes
        -   you don't have to declare your onmessage callbacks in any other callback, they can all be directly declared
            after creating your server
            callback etc.
    -   Authentication
        -   A function which handles Authentication and returns the resulting user objects can be defined
            in a parameter on creation
-   Client
    -   Awaitable connection creation
    -   Awaitable response for sent messages

## The Message Interface

A message which is sent from a client
to a server (and vice versa), always has the same format.

```typescript
type Message = { type: string; data?: any };
```

This format has no real restrictions, other than a type having to be defined.

This type is what defines the routing on both client and server side.

## Examples

### General Usage

The following code shows an example

```typescript
import { Client, Server };

// NOTE: All following Message types can have completely arbitrary names,
// they are just named the way they are to better show the functionality
const server = await Server.create();
server.onmessage("SEND_TYPE", async (data: any) => {
    console.log(JSON.stringify({type: "TEST_TYPE", data}));
});

server.onmessage("REQUEST_TYPE", async (data: any) => {
    return { type: "RESPONSE_MESSAGE", data: {}}
});

// Following code can also be pasted into a typescript based browser client
const client = await Client.connect("localhost:3000");

// Sending a message without await a message as a response
client.send({type: "TEST_TYPE", data: {}})

// Sending a message and await a response message from the server
const response = await client.request({ type: "REQUEST_TYPE", data: {} })
```

### Client

Creating a client with sockel can be achieved with the following lines of code.

#### connect - Connecting to the server

<br/>

```typescript
import { Client } from "sockel";

const client = await Client.connect("localhost:3000");
```

First thing to notice that you can await the connection call, meaning you don't have to write any code for
the onopen/onconnection event. This is a choice made to provide an async await way of writing sockel code.

<br/>

#### send - Sending a Message to the server

After awaiting the connection, you can instantly start to send a Message to the server.

The send function accepts an object with a type (for identifying the Message on the server) and an arbitrary data
. For more information on the message format see [Message formatting](Message formatting).

```typescript
client.send({ type: "TEST_TYPE", data: {} });
```

<br/>

#### request - Sending a Message and waiting for a response Message

Sockel provides a way to send a Message and then await a Message as a response (comparable to a POST request).

```typescript
const response: Message = await client.request({ type: "TEST_TYPE", data: {} });
```

The interface for the request method is the same as the send method.
The difference lies in the underlying request, appending the information that the client awaits a response message from the server.
