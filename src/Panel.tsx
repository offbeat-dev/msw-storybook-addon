import React from "react";
import { useAddonState, useChannel } from "@storybook/manager-api";
import { AddonPanel, Form, ScrollArea, Badge } from "@storybook/components";
import { ADDON_ID, EVENTS } from "./constants";
import { RangeControl as SBRangeControl } from "@storybook/blocks";
import { ObjectControl } from "@storybook/blocks";
import { styled } from "@storybook/theming";
import statusTextMap from "./utils/statusMap";

const statusCodes = Object.keys(statusTextMap);

const { Select: SBSelect } = Form;

interface PanelProps {
  active: boolean;
}

const ObjectContent = styled.div`
  margin-block-start: 2rem;

  h3 {
    margin-block-end: 0.5rem;
  }
`;

const Notice = styled.div`
  color: ${({ theme }) => theme.color.secondary};
  margin-block-start: 1rem;
  padding: 0.5rem;
  border-radius: 5px;
  inline-size: fit-content;
  font-weight: 400;
`;

const Container = styled.div`
  margin: 3rem;
  border: 1px solid ${({ theme }) => theme.appBorderColor};
  border-radius: 5px;
  box-shadow: rgb(0 0 0 / 10%) 0px 1px 3px 0px;
  padding: 2rem;
`;

const StatusAndDelayContainer = styled.div`
  display: flex;
  gap: 2rem;

  & > div {
    flex: 1;
  }

   & #control-delay {
    block-size: 28px;
  }
}`;

const HandlersAndResponses = styled.div`
  border: 1px solid ${({ theme }) => theme.appBorderColor};
  border-radius: 5px;
  margin-block-start: 1rem;
`;

const Select = styled(SBSelect)`
  inline-size: 100%;
`;

const RangeControl = styled(SBRangeControl)``;

const Label = styled.div`
  margin-bottom: 1rem;
`;

export const Panel: React.FC<PanelProps> = (props) => {
  const [addonState, setAddonState] = useAddonState(ADDON_ID, {} as any);

  const emit = useChannel({
    [EVENTS.SEND]: (newAddonState) => {
      setAddonState({ ...addonState, ...newAddonState });
    },
  });

  const onChange = (key: string, value: number | string) => {
    emit(EVENTS.UPDATE, { key, value });
  };

  const onChangeResponse = (
    key: string,
    objectKey: string,
    objectValue: number | string
  ) => {
    emit(EVENTS.UPDATE_RESPONSES, { key, objectKey, objectValue });
  };

  const getRender = () => {
    if (addonState.delay !== undefined && addonState.status !== undefined)
      return (
        <ScrollArea>
          <Container>
            <StatusAndDelayContainer>
              <div>
                <Label>
                  <h3>MSW status : {addonState.status}</h3>
                </Label>
                <Select
                  onChange={(event) => onChange("status", event.target.value)}
                  value={addonState.status}
                  name="status"
                >
                  {statusCodes.map((code) => (
                    <option key={code} value={code}>
                      {code} - {statusTextMap[code]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>
                  <h3>MSW delay : {addonState.delay} ms</h3>
                </Label>
                <RangeControl
                  name="delay"
                  value={addonState.delay}
                  onChange={(value) => onChange("delay", value)}
                  min={0}
                  max={10000}
                  step={500}
                />
              </div>
            </StatusAndDelayContainer>
            <ObjectContent>
              <Label>
                <h3>MSW handlers and responses</h3>
              </Label>
              <HandlersAndResponses>
                {addonState.responses &&
                  Object.keys(addonState.responses).length > 0 &&
                  Object.keys(addonState.responses).map((key) => (
                    <ObjectControl
                      key={key}
                      name={key}
                      value={addonState.responses[key].data}
                      onChange={(value) =>
                        onChangeResponse("responses", key, value)
                      }
                      theme={undefined}
                    />
                  ))}
              </HandlersAndResponses>
              <Notice>
                * refresh the browser tab to restore original response data.
              </Notice>
            </ObjectContent>
          </Container>
        </ScrollArea>
      );
    return <div>No mock data.</div>;
  };

  return (
    <AddonPanel {...props}>
      <div>{getRender()}</div>
    </AddonPanel>
  );
};
