#! /usr/bin/env node

const schedule = require('node-schedule');
const axios = require('axios').default;
const os = require('node-os-utils');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

function send(url, cpu, memory, disk, updates, securityUpdates, services) {
  axios.post(url, {
    cpu: cpu,
    memory: memory,
    disk: disk,
    updates: updates,
    security_updates: securityUpdates,
    services: services
  }).catch((err) => {
    console.log(err);
  });
}

async function getCPU() {
  let cpu = await os.cpu.usage();
  return Number(cpu).toFixed(2);
}

async function getMemory() {
  let mem = await os.mem.used();
  let used = (mem.usedMemMb / mem.totalMemMb) * 100;
  return Number(used).toFixed(2);
}

async function getDisk() {
  let disk = await os.drive.used("/");
  return Number(disk.usedPercentage).toFixed(2);
}

async function getUpdates() {
  let updates = await exec('apt list --upgradable 2>/dev/null | wc -l');
  return Number(updates.stdout);
}

async function getSecurityUpdates() {
  let updates = await exec('apt list --upgradable 2>/dev/null | grep "\-security" | wc -l');
  return Number(updates.stdout);
}

async function getServiceStatus(services) {
  let statuses = {};
  for (let i = 0; i < services.length; i++) {
    let status = await exec(`systemctl status ${services[i]}`);
    if (status.stdout.toString().includes('active (running)')) {
      statuses[services[i]] = true;
    } else {
      statuses[services[i]] = false;
    }
  }
  return statuses;
}

function main() {
  fs.readFile('/usr/local/share/vitomonitor/config.json', 'utf8', (err, data) => {
    if (err) {
      console.log(err);
    } else {
      const config = JSON.parse(data);
      schedule.scheduleJob('* * * * *', async function() {
        let cpu = await getCPU();
        let mem = await getMemory();
        let disk = await getDisk();
        let updates = await getUpdates();
        let securityUpdates = await getSecurityUpdates();
        if (!config.services) {
          config.services = [];
        }
        let statuses = await getServiceStatus(config.services);
        send(
          config.url,
          cpu,
          mem,
          disk,
          updates,
          securityUpdates,
          statuses
        );
      });
    }
  });
}

if (require.main === module) {
  main();
}