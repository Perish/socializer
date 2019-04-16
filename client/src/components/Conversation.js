import React, { Fragment, useState } from "react";
import { Query, Mutation } from "react-apollo";
import gql from "graphql-tag";
import { Card, Form } from "react-bootstrap";
import cx from "classnames";
import produce from "immer";
import { ErrorMessage, Loading, MessageThread, Subscriber } from "components";
import classes from "./Conversation.module.css";

const GET_CONVERSATION = gql`
  query GetConversation($id: String!) {
    conversation(id: $id) {
      id
      title
      messages {
        id
        body
        user {
          id
          name
          gravatarMd5
        }
      }
    }
  }
`;

const MESSAGES_SUBSCRIPTION = gql`
  subscription onMessageCreated($conversationId: String!) {
    messageCreated(conversationId: $conversationId) {
      id
      body
      user {
        id
        name
        gravatarMd5
      }
    }
  }
`;

const CREATE_MESSAGE = gql`
  mutation CreateMessage($conversationId: String!, $body: String!) {
    createMessage(conversationId: $conversationId, body: $body) {
      id
    }
  }
`;

const Conversation = ({
  match: {
    params: { id },
  },
}) => {
  const [body, setBody] = useState("");

  return (
    <Fragment>
      <Query query={GET_CONVERSATION} variables={{ id }}>
        {({ client, loading, error, data, subscribeToMore }) => {
          if (loading) return <Loading />;
          if (error) return <ErrorMessage message={error.message} />;
          return (
            <Subscriber
              subscribeToNew={() =>
                subscribeToMore({
                  document: MESSAGES_SUBSCRIPTION,
                  variables: { conversationId: id },
                  updateQuery: (prev, { subscriptionData }) => {
                    if (!subscriptionData.data) return prev;
                    const newMessage = subscriptionData.data.messageCreated;
                    return produce(prev, (next) => {
                      next.conversation.messages.push(newMessage);
                    });
                  },
                })
              }
            >
              <div className={cx("d-flex", classes.chatLayout)}>
                <h5>{data.conversation.title}</h5>
                <hr />
                <MessageThread messages={data.conversation.messages} />

                <Mutation
                  mutation={CREATE_MESSAGE}
                  onCompleted={() => setBody("")}
                >
                  {(submit, { data, loading, error }) => {
                    return (
                      <Card className="mt-2">
                        <Card.Body>
                          <Form
                            onSubmit={(e) => {
                              e.preventDefault();
                              submit({
                                variables: { body, conversationId: id },
                              });
                            }}
                          >
                            <Form.Group>
                              <Form.Control
                                rows="3"
                                placeholder="What's on your mind?"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                              />
                            </Form.Group>
                          </Form>
                        </Card.Body>
                      </Card>
                    );
                  }}
                </Mutation>
              </div>
            </Subscriber>
          );
        }}
      </Query>
    </Fragment>
  );
};

export default Conversation;