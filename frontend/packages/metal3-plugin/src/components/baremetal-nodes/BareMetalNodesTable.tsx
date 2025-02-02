import * as React from 'react';
import { sortable } from '@patternfly/react-table';
import * as classNames from 'classnames';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import NodeRoles from '@console/app/src/components/nodes/NodeRoles';
import { TableRow, TableData, Table, RowFunction } from '@console/internal/components/factory';
import { Kebab, ResourceLink } from '@console/internal/components/utils';
import { MachineModel, NodeModel } from '@console/internal/models';
import { referenceForModel } from '@console/internal/module/k8s';
import { DASH, getName, getUID, getNamespace, SecondaryStatus } from '@console/shared';
import { useMaintenanceCapability } from '../../hooks/useMaintenanceCapability';
import { BareMetalHostModel } from '../../models';
import { getHostBMCAddress } from '../../selectors';
import { baremetalNodeSecondaryStatus } from '../../status/baremetal-node-status';
import { BareMetalNodeBundle, BareMetalNodeListBundle, isCSRBundle, CSRBundle } from '../types';
import BareMetalNodeStatus from './BareMetalNodeStatus';
import CSRStatus from './CSRStatus';
import { menuActions } from './menu-actions';

import './baremetal-nodes-table.scss';

const tableColumnClasses = {
  name: classNames('col-lg-3', 'col-md-4', 'col-sm-12', 'col-xs-12'),
  status: classNames('col-lg-3', 'col-md-4', 'col-sm-6', 'hidden-xs'),
  role: classNames('col-lg-2', 'col-md-4', 'hidden-sm', 'hidden-xs'),
  machine: classNames('col-lg-2', 'hidden-md', 'hidden-sm', 'hidden-xs'),
  address: classNames('col-lg-2', 'hidden-md', 'hidden-sm', 'hidden-xs'),
  kebab: Kebab.columnClass,
};

const BareMetalNodesTableHeader = (t: TFunction) => () => [
  {
    title: t('metal3-plugin~Name'),
    sortField: 'name',
    transforms: [sortable],
    props: { className: tableColumnClasses.name },
  },
  {
    title: t('metal3-plugin~Status'),
    sortField: 'status.status',
    transforms: [sortable],
    props: { className: tableColumnClasses.status },
  },
  {
    title: t('metal3-plugin~Role'),
    sortField: 'machine.metadata.labels["machine.openshift.io/cluster-api-machine-role"]',
    transforms: [sortable],
    props: { className: tableColumnClasses.role },
  },
  {
    title: t('metal3-plugin~Machine'),
    sortField: "metadata.annotations['machine.openshift.io/machine']",
    transforms: [sortable],
    props: { className: tableColumnClasses.machine },
  },
  {
    title: t('metal3-plugin~Management Address'),
    sortField: 'host.spec.bmc.address',
    transforms: [sortable],
    props: { className: tableColumnClasses.address },
  },
  {
    title: '',
    props: { className: tableColumnClasses.kebab },
  },
];

const CSRTableRow: React.FC<BareMetalNodesTableRowProps<CSRBundle>> = ({
  obj,
  index,
  rowKey,
  style,
}) => {
  return (
    <TableRow id={obj.csr.metadata.uid} index={index} trKey={rowKey} style={style}>
      <TableData className={tableColumnClasses.name}>{obj.metadata.name}</TableData>
      <TableData className={tableColumnClasses.status}>
        <CSRStatus csr={obj.csr} title={obj.status.status} />
      </TableData>
      <TableData className={tableColumnClasses.role}>{DASH}</TableData>
      <TableData className={tableColumnClasses.machine}>{DASH}</TableData>
      <TableData className={tableColumnClasses.address}>{DASH}</TableData>
      <TableData className={tableColumnClasses.kebab} />
    </TableRow>
  );
};

type BareMetalNodesTableRowProps<R = CSRBundle | BareMetalNodeBundle> = {
  obj: R;
  index: number;
  rowKey: string;
  style: object;
};

const BareMetalNodesTableRow: React.FC<BareMetalNodesTableRowProps<BareMetalNodeBundle>> = ({
  obj: { host, node, nodeMaintenance, machine, status, csr },
  index,
  rowKey,
  style,
}) => {
  const { t } = useTranslation();
  const [hasNodeMaintenanceCapability, maintenanceModel] = useMaintenanceCapability();
  const nodeName = getName(node);
  const hostName = getName(host);
  const namespace = getNamespace(host);
  const address = getHostBMCAddress(host);
  const uid = getUID(node);

  return (
    <TableRow id={uid} index={index} trKey={rowKey} style={style}>
      <TableData className={tableColumnClasses.name}>
        {node ? (
          <ResourceLink kind="Node" name={nodeName} />
        ) : (
          <ResourceLink
            kind={referenceForModel(BareMetalHostModel)}
            name={hostName}
            namespace={namespace}
          />
        )}
      </TableData>
      <TableData className={tableColumnClasses.status}>
        <BareMetalNodeStatus {...status} nodeMaintenance={nodeMaintenance} csr={csr} />
        <SecondaryStatus status={baremetalNodeSecondaryStatus({ node, nodeMaintenance, host })} />
      </TableData>
      <TableData className={tableColumnClasses.role}>
        <NodeRoles node={node} />
      </TableData>
      <TableData className={tableColumnClasses.machine}>
        {machine ? (
          <ResourceLink
            kind={referenceForModel(MachineModel)}
            name={getName(machine)}
            namespace={getNamespace(machine)}
          />
        ) : (
          DASH
        )}
      </TableData>
      <TableData className={tableColumnClasses.address}>{address}</TableData>
      <TableData className={tableColumnClasses.kebab}>
        <Kebab
          options={menuActions.map((action) =>
            action(
              NodeModel,
              node,
              { csr },
              { nodeMaintenance, hasNodeMaintenanceCapability, maintenanceModel, t },
            ),
          )}
          key={`kebab-for-${uid}`}
          id={`kebab-for-${uid}`}
        />
      </TableData>
    </TableRow>
  );
};

type BareMetalNodesTableProps = React.ComponentProps<typeof Table> & {
  data: BareMetalNodeBundle[];
};

const BareMetalNodesTable: React.FC<BareMetalNodesTableProps> = (props) => {
  const { t } = useTranslation();
  const row = React.useCallback<RowFunction<BareMetalNodeListBundle>>(
    (rowProps) =>
      isCSRBundle(rowProps.obj) ? (
        <CSRTableRow
          obj={rowProps.obj}
          index={rowProps.index}
          rowKey={rowProps.key}
          style={rowProps.style}
        />
      ) : (
        <BareMetalNodesTableRow
          obj={rowProps.obj}
          index={rowProps.index}
          rowKey={rowProps.key}
          style={rowProps.style}
        />
      ),
    [],
  );
  return (
    <Table
      {...props}
      defaultSortField="node.metadata.name"
      aria-label={t('metal3-plugin~Nodes')}
      Header={BareMetalNodesTableHeader(t)}
      Row={row}
      virtualize
    />
  );
};

export default BareMetalNodesTable;
