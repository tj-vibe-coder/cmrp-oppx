#!/usr/bin/env python3
import csv

def extract_incomplete_project_codes():
    """Extract records that had incomplete project codes and show their generated codes"""
    
    # These are the records from the fix log with their generated codes
    incomplete_records = [
        ("LA CARLOTA Distillation FDAS PM & Gas Detector & Alarm Inst'n PR No. 1200007856", "CMRP2501385", "2025-01-18"),
        ("LA CARLOTA Distillery Rehabilitation & Centralization of 7-Zones FDAS", "CMRP2501385", "2025-01-18"),
        ("URC Cal Rewinding of 3 Induction Motors  PR 1000123808", "CMRP2501211", "2025-01-20"),
        ("MRT7 Station 9 VO (Works)", "CMRP2504760", "2025-04-23"),
        ("MRT7 Station 9 VO (CAD)", "CMRP2504760", "2025-04-23"),
        ("URC Pam Replace HMI of Line 3 Filler Machine (RFP by Sir Errol Ventura for TJ)", "CMRP2502753", "2025-02-08"),
        ("URC Binan Cabana Packaging Machine HMI Upgrade", "CMRP2502357", "2025-02-14"),
        ("PASSI Assess & Repair ASSENWARE FDAS (PR 1000128249)", "CMRP2502983", "2025-02-19"),
        ("Laguna Water Rehab of Mobile Water Treatment Plant", "CMRP2502936", "2025-02-24"),
        ("DDT House of Representative Secretariat Bldg Auxillary", "CMRP2502005", "2025-02-26"),
        ("URC San Pedro 2_ PM of 8 units Transformers (PR1000134285)", "CMRP2502932", "2025-02-27"),
        ("QC Secretariat Supply, Deliver & Installation of Electrical & Auxiliary Works", "CMRP2503754", "2025-03-06"),
        ("Dept. Of Finance BMS Preventive Maintenance", "CMRP2503972", "2025-03-07"),
        ("PASSI_FDAS & Fire Suppression System @ Boiler No.5 (PR 1200015592)", "CMRP2503972", "2025-03-07"),
        ("URC San Pedro 1_ Installation of  5-unit High Bay Lamp at DC Warehouse", "CMRP2503742", "2025-03-10"),
        ("NURC Tarlac_ PM of Transformers (PR PR 1300001491) March 22 Execution", "CMRP2503742", "2025-03-10"),
        ("MIOX On-site Chlorine Generation System (Brine Cell Replacement)", "CMRP2503022", "2025-03-11"),
        ("URC Pam PMS of Genset #6 & Genset #7 on HOLY WEEK (PR 1000129029)", "CMRP2503328", "2025-03-12"),
        ("La Carlota_CO2 Engineering Workstation and Project PC (PR 1200009773)", "CMRP2503328", "2025-03-12"),
        ("URC Canlubang_FDAS PM/Inspection - (PR 1000113352)", "CMRP2503297", "2025-03-26"),
        ("URC Canlubang_Elec'l Equipment/Substations PM Works (PR 1200015824)", "CMRP2503297", "2025-03-26"),
        ("URC Cavite _LBS Installation at SubsStation (PR  1200015875)", "CMRP2504175", "2025-04-03"),
        ("SURE Bais_ WTP LCD Replacement Annual PM (PR 1000134530)", "CMRP2504363", "2025-04-07"),
        ("URC SP1_Improvement of Controlled & Combustible", "CMRP2504363", "2025-04-07"),
        ("URC Binan  Holy Week Transformers PM (PR  1000138203)", "CMRP2504054", "2025-04-02"),
        ("Maintenance Service Agreement NS2550A)– Electrical System of WSO Facilities (2 years)", "CMRP2504760", "2025-04-23"),
        ("NURC Tarlac_Supply & Install PAGM System (PR PR 1200017503 )", "CMRP2504898", "2025-04-25"),
        ("Pepsi Cola_ Sto Tomas,- Electrical Repair of Fire Pump Motor", "CMRP2504468", "2025-04-28"),
        ("URC San Pablo_ June-July Annual PM of Substation 1 and 2", "CMRP2504834", "2025-04-30"),
        ("Westside City CCTV", "CMRP2505008", "2025-05-05"),
        ("SONEDCO_Boiler# 5 Automatic Fire Suppression System (PR 1200015592)", "CMRP2505120", "2025-05-16"),
        ("URC Pasig Pinagbuhatan DC_Installation of Hochiki FDAS", "CMRP2505226", "2025-05-19"),
        ("URC Pam 1_Installation of 12 units Solar Perimeter Lightings (PR 1000148145)", "CMRP2505226", "2025-05-19"),
        ("URC Pam 1_Installation of Lightings at Bakery DC Tunnel (PR 1000148146)", "CMRP2505226", "2025-05-19"),
        ("URC Pam NLDC_Annual PMS of FDAS (PR 1000148564)", "CMRP2505226", "2025-05-19"),
        ("UCP Pasig_Telephone System Improvement (Phase 1)", "CMRP2505788", "2025-05-08"),
        ("URC ESMO PM of 3 Power Transformers (PR 1000129599)", "CMRP2504033", "2025-04-02"),
        ("URC Pam 1_Bakery/Snacks MVSG PMS on Holy Week (PR 1000127786--127525)", "CMRP2503338", "2025-03-13"),
        ("URC Calamba 1_Repair Power Module for ATLAS COPCO Compressor", "CMRP2505947", "2025-05-07"),
        ("URC Bagumbayan_Installation of Additional CCTV at DC Warehouse (PR 1200017729)", "CMRP2505272", "2025-05-14"),
        ("Maynilad_OH & Fabricatte Screw Press Deawatering System100 Perforated screen", "CMRP2505516", "2025-05-20"),
        ("URC Canlubang_Rehab of Intercom & Paging System (PR 1200017421)", "CMRP2505224", "2025-05-21"),
        ("URC Sn Pedro 2_Supply/Install Potential Transformer (34.5KV/1.732) @ MDP (PR 1000145075)", "CMRP2505224", "2025-05-21"),
        ("Supply & Install Water Distillation Laboratory Equipment (Milli-Q EQ 7008/7016)", "CMRP2505777", "2025-05-22"),
        ("Install Production Meter and Pressure Gauge at GDC (RFQ :  859960)", "CMRP2505338", "2025-05-22"),
        ("Uniliver Selecta Emergency Alarm Rehabilitaiton and Monitoring", "CMRP2505402", "2025-05-28"),
        ("Rehabilitation of Genset 375 KVA (RFQ : RFQ : 704633)", "CMRP2505402", "2025-05-28"),
        ("La Carlota Dist._ Install HYBRID FDAS @ Proces, QA & CO2 (PR 1200016217rev)", "CMRP2505279", "2025-05-29"),
        ("BAIS_S&I FDAS & Sprinkler at MATCON Chem'l Whse.(PR 1000147318)", "CMRP2505279", "2025-05-29"),
        ("URSUMCO_Maintain & Repair FDAS & Suppression System (PR 1000141304 - 307)", "CMRP2505279", "2025-05-29"),
        ("URC Cal 2_Repair/Rehab Shaaf Inverter/Motor (RFP by Sir Vlad Cambri)", "CMRP2505353", "2025-05-30"),
        ("URC Pam 2_ Bldg 1 Boiler PLC and CPU Upgrade (RFP by Sir Errol)", "CMRP2506392", "2025-06-03"),
        ("URC Cal 2_ S&I UPS, TVSS and Panel Restoration (RFP by Sir VJ Abogado)", "CMRP2506552", "2025-06-04"),
        ("URC Cal 2_Replace Busted Lights at Logistics Whse. (PR 1300001621)", "CMRP2506732", "2025-06-05"),
        ("URC Cal 2_Replace Busted Lights at Snacks A, B & C (PR 1300001620)", "CMRP2506732", "2025-06-05"),
        ("URC Cebu 2_PMS of Substation 2 Transformer & MVSG (PR 1000151182)", "CMRP2506348", "2025-06-18"),
        ("URC SP2 _Repair of HMI Touch Panel, Conbar Line (PR 1000153628)", "CMRP2506277", "2025-06-20"),
        ("URC SP2 _Repair of PCL Yamato Weigher HMI LCD (PR 1000153528)", "CMRP2506277", "2025-06-20"),
        ("SURE LC_ GSM/CGC to TCP/IP, Modbus RTU to OPC-UA, Haiwell A8 panel install'n, SCADA/Data historian configuration.(PR100007300)", "CMRP2506739", "2025-06-21"),
        ("SURE LC_ S&I 2-sets Onay Paratoner 214M Lightning Arrester (PR 1200014782)", "CMRP2506252", "2025-06-21"),
        ("SURE-PASSI_PMS Boiler Automation (PR 1000138639)", "CMRP2506816", "2025-06-22"),
        ("SURE-PASSI_PMS & Start Up Support for Pan/ Evap (PR 1000138670)", "CMRP2506816", "2025-06-22"),
        ("SURE LC Distillery_PLC Upgrade/Programming (PR 1200017759 )", "CMRP2507135", "2025-07-01"),
        ("URC Cal 1_Structural Analysis & Integrity Certification", "CMRP2507135", "2025-07-01"),
        ("URC Pam 2_Restoration of WTP UV Lamp (PR 1200018415)", "CMRP2507143", "2025-07-02"),
        ("URC Cal 1_ PM of Distribution Line Insulators and LBS (PR 1000156333)", "CMRP2507175", "2025-07-03"),
        ("URC Pam 2_Restoration of WTP UV Lamp (PR 1200018679 )", "CMRP2507175", "2025-07-03"),
        ("CCTV & PAGA Systems @ Petron Navotas Terminal Expansion Proj. Phase1 (E-2025-030)", "CMRP2507175", "2025-07-03"),
        ("SURE LC_Electrical Grounding test for all Power Substations (PR#1000141558", "CMRP2507555", "2025-07-07"),
        ("SURE LC_Annual PM HMI LCD Siemens at WTP (PR_1000141558)", "CMRP2507608", "2025-07-08"),
        ("URC Cal 1 - Electrical Works Replacement of Various Power Equipments", "CMRP2507979", "2025-07-11"),
        ("URC SP-1 _ Installation Smoke Control Project Phase 1", "CMRP2507485", "2025-07-05"),
        ("URC SP-2_S&I Power Meters @ Logistics/Creamall & Coffee", "CMRP2507485", "2025-07-05"),
        ("URC Cav_MNT : Additional Cavite Plant FDAS (PR 1200018724)", "CMRP2507129", "2025-07-01"),
        ("URC Tera_ Electrical works at TERA Tower", "CMRP2507801", "2025-07-09"),
        ("SURE Balayan_PM Fire Suppression @ Power House (PR 1200018439)", "CMRP2507646", "2025-07-08"),
        ("SURE Balayan_PM Fire Suppression @ Boiler Cntrl. Rm. (PR 12000145098)", "CMRP2507646", "2025-07-08"),
        ("SURE Balayan_PM Fire Suppression @ ISD Central Rm (PR 12000145099)", "CMRP2507646", "2025-07-08"),
        ("URC Cal 2_ Transformer Oil Leak Degassification (PR 1300001672 )", "CMRP2507300", "2025-07-04"),
        ("S&I Fire and Gas System (Darrow Blue Energy H2 Pkg 3)", "CMRP2508955", "2025-08-12"),
        ("URC Malvar_Electrical Works for PRL Line", "CMRP2508955", "2025-08-12"),
        ("CPX25-Upgrade & Configure Cross Feeder (PDS) System of Schaaf", "CMRP2508955", "2025-08-12")
    ]
    
    print("RECORDS WITH INCOMPLETE PROJECT CODES")
    print("="*80)
    print(f"{'Project Name':<80} {'Generated Code':<15} {'Date'}")
    print("="*80)
    
    for project_name, generated_code, date in incomplete_records:
        print(f"{project_name[:79]:<80} {generated_code:<15} {date}")
    
    print(f"\nTotal records with incomplete codes fixed: {len(incomplete_records)}")
    
    # Also create a CSV file for easy reference
    output_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/incomplete_project_codes_list.csv'
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Project Name', 'Generated Code', 'Date', 'UID'])
        
        # Now get the UIDs from the corrected file
        current_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring.csv'
        with open(current_file, 'r', encoding='utf-8') as current_csv:
            reader = csv.reader(current_csv)
            for row in reader:
                if len(row) >= 30:  # Ensure we have enough columns
                    project_name = row[1]
                    project_code = row[2] 
                    uid = row[29] if len(row) > 29 else ""
                    date = row[0]
                    
                    # Check if this project matches any of our incomplete records
                    for incomplete_name, incomplete_code, incomplete_date in incomplete_records:
                        if project_name == incomplete_name and project_code == incomplete_code:
                            writer.writerow([project_name, project_code, date, uid])
                            break
    
    print(f"\nDetailed CSV report saved to: {output_file}")

if __name__ == "__main__":
    extract_incomplete_project_codes()