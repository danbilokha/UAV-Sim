class ClusterHead{
  constructor(uav){
    this.uav = uav;
    this.nrOfBranches = 4;
    //this.nrOfIncomingMsg = 0; // Not needed anymore
    this.branches = [];
    for(let i = 0; i < this.nrOfBranches; i++) {
      this.branches.push(new UAVBranch(UAVColor.BRANCH_COLOR[i % UAVColor.BRANCH_COLOR.length]));
    }
    uav.shouldAcceptChildren = true;
    uav.ownWeight = 0;

    if(uav.parent) uav.parent.removeChild(this);
    uav.parent = null;
  }

  draw(){
    var head = this.uav;
    let branches = this.getOccupiedBranches();
    for(let i=0; i<branches.length; ++i){
      var child = branches[i].head;
      while(head && child){
        push();
          let pos1 = head.actualPosition;
          let pos2 = child.actualPosition;
          vertex(pos1.x, pos1.y, pos1.z);
          vertex(pos2.x, pos2.y, pos2.z);
        pop();
        head = child;
        if(head) child = head.child;
      }
      head = this.uav;
    }
  }

  getOccupiedBranches() {
    return this.branches.filter(branch => branch.head);
  }

  getFreeBranches() {
    return this.branches.filter(branch => !branch.head);
  }

  getNumberOfOccupiedBranches() {
    return this.getOccupiedBranches().length;
  }

  getBranchOfHead(head) {
    let branch = this.getOccupiedBranches().filter(branch => branch.head.id == head.id);
    return branch.length > 0 ? branch[0] : null;
  }

  hasBranch(head){
    return this.getBranchOfHead(head) != null;
  }

  clearBranches(){
    let branches = this.getOccupiedBranches();
    for(let i=0; i<branches.length; ++i) {
      branches[i].head.didBecomeDUAV();
      branches[i].head = null;
    }
  }

  willBecomeDUAV(){
    this.clearBranches();
  }

  childDidAskForConnection(child){
    return this.getNumberOfOccupiedBranches()<this.nrOfBranches;
  }

  appendChild(child){
    let branch = this.getFreeBranches()[0];
    branch.head = child;
    child._color = branch.color;
    child.parent = this.uav;
    child.ownWeight = this.uav.ownWeight+1;
    this.uav.shouldFlock = child.shouldFlock = false;
    let branches = this.getOccupiedBranches();
    if(branches.length == this.nrOfBranches && this.uav.shouldAcceptChildren){
        this.uav.shouldAcceptChildren = false;
        this.startAcceptingAdditionalLeaf();
    }
  }

  didGetNewChild(child){
    let branch = this.getBranchOfHead(child);
    if(branch) {
      branch.length++;
      this.startAcceptingAdditionalLeaf();
    }
  }

  startAcceptingAdditionalLeaf(){
    let branches = this.getOccupiedBranches();
    if(branches.length == this.nrOfBranches) {
      let minBranchLength = min(branches.map(branch => branch.length));
      for(let i=0; i<branches.length; ++i){
        if(branches[i].length == minBranchLength) {
          branches[i].head.startAcceptingNewLeaf();
        }
      }
    }
  }

  stopAcceptingAdditionalLeaf(){
    let branches = this.getOccupiedBranches();
    for(let i=0; i<branches.length; ++i){
      branches[i].head.stopAcceptingNewLeaf();
    }
  }

  removeBranch(branchChild){
    let branch = this.getBranchOfHead(branchChild);
    if(branch) {
      branch.head.didBecomeDUAV();
      branch.head = null;

      if(this.getNumberOfOccupiedBranches() == 0) {
        this.uav.didBecomeDUAV();
      } else {
        this.stopAcceptingAdditionalLeaf();
        this.balanceCluster();
        this.uav.shouldAcceptChildren = true;
      }
    }
  }

  didLoseChild(branchChild, weight) {
    let branch = this.getBranchOfHead(branchChild);
    if(branch) {
      branch.length = weight;
      this.stopAcceptingAdditionalLeaf();
      this.balanceCluster();
      this.startAcceptingAdditionalLeaf();
    }
  }

  balanceCluster() {
    let branches = this.getOccupiedBranches();
    let minBranchLength = min(branches.map(branch => branch.length));
    for(let i=0; i<branches.length; ++i){
      if(branches[i].length > minBranchLength + 1) {
        branches[i].head.removeChildAt(minBranchLength + 2);
        branches[i].length = minBranchLength + 1;
      }
    }
  }

  checkForDeadLinks(){
    let branches = this.getOccupiedBranches();
    for(let i = 0; i < branches.length; i++) {
      if(this.uav.distanceTo(branches[i].head) > this.uav._communicationRange){
        this.removeBranch(branches[i].head);
      }
    }
  }

}
