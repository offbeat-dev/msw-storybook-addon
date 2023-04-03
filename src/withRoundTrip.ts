import { addons, useChannel } from "@storybook/preview-api";
import type {
  Renderer,
  PartialStoryFn as StoryFunction,
  Parameters,
} from "@storybook/types";
import { STORY_CHANGED, FORCE_REMOUNT } from "@storybook/core-events";
import { EVENTS, PARAM_KEY } from "./constants";
import { RequestHandler, context, createResponseComposition, rest } from "msw";

type Context = {
  [x: string]: any;
  parameters: Parameters;
};

type ResponseObject = {
  [key: string]: string | number | Record<string, any>;
};

const channel = addons.getChannel();

let INITIAL_MOUNT_STATE = true;
let STORY_CHANGED_STATE = false;
let delay = 0;
let status = 200;
let responses: Record<string, any> = {};
let moveTimeout: any;

const getParameter = (
  parameters: Parameters,
  key: string,
  defaultValue: any[]
) => {
  return parameters[key] || defaultValue;
};

export const transformedResponse = (s: number, d: number, r: any) => {
  return createResponseComposition(null, [context.json(r)]);
};

const updateHandlers = (handlers: RequestHandler[]) => {
  if (!handlers) return;
  const worker = (window as any).msw;
  handlers.forEach((handler: any) => {
    const currentResponse = responses[handler.info.path];
    status = currentResponse.status;
    worker.use(
      rest.get(handler.info.path, (req, res, ctx) => {
        return res(
          ctx.status(currentResponse.status),
          ctx.delay(delay),
          ctx.json(currentResponse.data)
        );
      })
    );
  });
};

export const withRoundTrip = (
  storyFn: StoryFunction<Renderer>,
  ctx: Context
) => {
  let parameters,
    msw: { handlers: any; originalResponses: Record<string, any> },
    handlers: any;

  parameters = ctx.parameters;
  if (parameters) msw = getParameter(parameters, PARAM_KEY, []);
  if (!msw) return storyFn();

  const emit = useChannel({
    [EVENTS.UPDATE]: ({ key, value }) => {
      if (key === "delay") {
        clearTimeout(moveTimeout);
        delay = value;
        updateHandlers(handlers);
        moveTimeout = setTimeout(() => {
          channel.emit(FORCE_REMOUNT, { storyId: ctx.id });
        }, 300);
      }
      if (key === "status") {
        status = value;
        Object.keys(responses).forEach((key: any) => {
          responses[key].status = value;
        });
        updateHandlers(handlers);
        channel.emit(FORCE_REMOUNT, { storyId: ctx.id });
      }
      const responseObject: ResponseObject = {
        delay: delay,
        status: status,
        responses: responses,
      };
      emit(EVENTS.SEND, responseObject);
    },
    [EVENTS.UPDATE_RESPONSES]: ({ key, objectKey, objectValue }) => {
      if (key === "responses") {
        responses[objectKey].data = objectValue;
        const responseObject: ResponseObject = {
          delay: delay,
          status: status,
          responses: responses,
        };
        updateHandlers(handlers);
        emit(EVENTS.SEND, responseObject);
        channel.emit(FORCE_REMOUNT, { storyId: ctx.id });
      }
    },
  });

  if (INITIAL_MOUNT_STATE) {
    handlers = msw.handlers;
    responses = msw.originalResponses;
    updateHandlers(handlers);
    emit(EVENTS.SEND, { status, delay, responses });
    channel.on(STORY_CHANGED, () => {
      delete msw.originalResponses;

      const worker = (window as any).msw;
      worker.stop();

      STORY_CHANGED_STATE = true;
      location.reload();
    });
    INITIAL_MOUNT_STATE = false;
  }

  if (STORY_CHANGED_STATE) {
    STORY_CHANGED_STATE = false;
    channel.emit(FORCE_REMOUNT, { storyId: ctx.id });
  }

  return storyFn();
};
