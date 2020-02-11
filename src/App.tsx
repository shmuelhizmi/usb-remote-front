import React from "react";
import axios from "axios";
import socketIOClient from "socket.io-client";
import { Tree, ITreeNode, Classes, Card } from "@blueprintjs/core";

import "@blueprintjs/core/lib/css/blueprint.css";
interface device {
  bus: number;
  id: number;
  vendor: number;
  stringDescriptor?: string;
}

interface AppProps {}

interface AppState {
  nodes: ITreeNode<device | undefined>[];
  selected?: device;
}
const settings: { endpoint: string } = require("./conf.json");
export default class App extends React.Component<AppProps, AppState> {
  devices: device[];
  socket: SocketIOClient.Socket;
  constructor(props: AppProps) {
    super(props);
    this.socket = socketIOClient(settings.endpoint);
    this.state = {
      nodes: []
    };
    this.devices = [];
  }

  componentDidMount() {
    axios.get<device[]>("http://localhost:5000/list").then(v => {
      this.devices = v.data;
      this.setState({ nodes: this.mapDevicesToTree(this.devices) });
    });

    this.socket.on("add", (data: device) => {
      const existing = this.devices.find(v => v.id == data.id);
      if (!existing) {
        this.devices.push(data);
        this.setState({ nodes: this.mapDevicesToTree(this.devices) });
      }
    });

    this.socket.on("remove", (data: device) => {
      this.devices = this.devices.filter(v => v.id != data.id);
      this.setState({ nodes: this.mapDevicesToTree(this.devices) });
    });
  }

  mapDevicesToTree(devices?: device[]) {
    if (devices) {
      const resualt: ITreeNode<device | undefined>[] = [];
      devices.forEach(device => {
        let bus = resualt.find(bus => bus.id === device.bus);
        if (!bus) {
          bus = { label: `bus - ${device.bus}`, id: device.bus };
          resualt.push(bus);
        }
        if (!bus.childNodes) {
          bus.childNodes = [];
        }
        bus.childNodes.push({
          label: device.stringDescriptor || device.id.toString(),
          id: device.id,
          nodeData: device
        });
      });
      return resualt;
    }
    return [];
  }

  private handleNodeClick = (
    nodeData: ITreeNode<device | undefined>,
    _nodePath: number[],
    e: React.MouseEvent<HTMLElement>
  ) => {
    const originallySelected = nodeData.isSelected;
    if (!e.shiftKey) {
      this.forEachNode(this.state.nodes, n => (n.isSelected = false));
    }
    nodeData.isSelected =
      originallySelected == null ? true : !originallySelected;
    this.setState({ ...this.state, selected: nodeData.nodeData });
  };

  private handleNodeCollapse = (nodeData: ITreeNode<device | undefined>) => {
    nodeData.isExpanded = false;
    this.setState(this.state);
  };

  private handleNodeExpand = (nodeData: ITreeNode<device | undefined>) => {
    nodeData.isExpanded = true;
    this.setState(this.state);
  };

  private forEachNode(
    nodes: ITreeNode<device | undefined>[] | undefined,
    callback: (node: ITreeNode<device | undefined>) => void
  ) {
    if (nodes) {
      for (const node of nodes) {
        callback(node);
        this.forEachNode(node?.childNodes, callback);
      }
    }
  }

  render() {
    return (
      <div className="bp3-dark">
        <Tree
          onNodeClick={this.handleNodeClick}
          onNodeCollapse={this.handleNodeCollapse}
          onNodeExpand={this.handleNodeExpand}
          className={Classes.ELEVATION_0}
          contents={this.state.nodes}
        ></Tree>
        <Card style={{ position: "absolute", right: 100, top: 20 }}>
          {this.state.selected ? (
            <div>
              <h2>name - <div className="info" >{this.state.selected.stringDescriptor||"unknows"}</div></h2>
              <h2>id - <div className="info" >{this.state.selected.id}</div></h2>
              <h2>vendoe - <div className="info" >{this.state.selected.vendor}</div></h2>
              <h2>bus number - <div className="info" >{this.state.selected.bus}</div></h2>
            </div>
          ) : (
            <h3>select use to see more info...</h3>
          )}
        </Card>
      </div>
    );
  }
}
