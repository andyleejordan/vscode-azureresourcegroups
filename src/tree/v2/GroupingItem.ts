import { TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ApplicationResource, BranchDataProvider, ResourceModelBase } from '../../api/v2/v2AzureResourcesApi';
import { BranchDataItemFactory } from './BranchDataItem';
import { BranchDataProviderFactory } from './providers/BranchDataProviderManager';
import { ResourceGroupItem } from './ResourceGroupItem';
import { ResourceGroupsTreeContext } from './ResourceGroupsTreeContext';

export class GroupingItem implements ResourceGroupItem {
    private description: string | undefined;

    constructor(
        public readonly context: ResourceGroupsTreeContext,
        private readonly branchDataItemFactory: BranchDataItemFactory,
        private readonly branchDataProviderFactory: (ApplicationResource) => BranchDataProvider<ApplicationResource, ResourceModelBase>,
        private readonly contextValues: string[] | undefined,
        private readonly iconPath: TreeItemIconPath | undefined,
        public readonly label: string,
        public readonly resources: ApplicationResource[]) {
    }

    async getChildren(): Promise<ResourceGroupItem[] | undefined> {
        const resourceItems = await Promise.all(this.resources.map(
            async resource => {
                const branchDataProvider = this.branchDataProviderFactory(resource);
                const resourceItem = await branchDataProvider.getResourceItem(resource);

                return this.branchDataItemFactory(resourceItem, branchDataProvider);
            }));

        return resourceItems;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);

        treeItem.contextValue = this.contextValues?.join(' ');
        treeItem.description = this.description;
        treeItem.iconPath = this.iconPath;

        return treeItem;
    }

    async withDescription(description: string, callback: () => Promise<void>): Promise<void> {
        this.description = description;
        this.context.refresh(this);

        try {
            await callback();
        } finally {
            this.description = undefined;
            this.context.refresh(this);
        }
    }

    id: string;
    name: string;
    type: string;
}

export type GroupingItemFactory = (context: ResourceGroupsTreeContext, contextValues: string[] | undefined, iconPath: TreeItemIconPath | undefined, label: string, resources: ApplicationResource[]) => GroupingItem;

export function createGroupingItemFactory(branchDataItemFactory: BranchDataItemFactory, branchDataProviderFactory: BranchDataProviderFactory): GroupingItemFactory {
    return (context, contextValues, iconPath, label, resources) => new GroupingItem(context, branchDataItemFactory, branchDataProviderFactory, contextValues, iconPath, label, resources);
}
