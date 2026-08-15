export const UI_INTENT_TYPES = [
  'composer.submit',
  'run.stop',
  'permission.approve',
  'permission.deny',
] as const;

export type ComposerSubmitIntent = {
  type: 'composer.submit';
  content: string;
};

export type RunStopIntent = {
  type: 'run.stop';
};

export type PermissionApproveIntent = {
  type: 'permission.approve';
  toolCallId: string;
};

export type PermissionDenyIntent = {
  type: 'permission.deny';
  toolCallId: string;
};

export type UiIntent =
  | ComposerSubmitIntent
  | RunStopIntent
  | PermissionApproveIntent
  | PermissionDenyIntent;

export type UiIntentHandler = (intent: UiIntent) => void;
