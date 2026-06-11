export interface PermissionExplainContent {
  title: string
  content: string
}

export function requestAndroidPermission(
  permissionName: string,
  explainContent?: PermissionExplainContent,
): Promise<1 | 0 | -1>
